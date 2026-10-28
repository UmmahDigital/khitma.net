import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp, recordedEvents, recordEventsAcrossReloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, newGroupId } from '../support/fixtures';

// Ramadan is when most khitmas are made. The test clock (1 March 2026) is the 12th of Ramadan 1447, which ends on
// 19 March (Umm al-Qura); Eid is Friday 20 March.

const ADMIN = 'أبو أحمد';
const AUTO_BOOK = 1;

async function createdGroupId(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
  return new URL(page.url()).pathname.split('/')[2];
}

test.describe('Ramadan', () => {
  test('during the season, the home page offers the two Ramadan khitmas; not otherwise', async ({ page, browser }) => {
    await openApp(page, '/', { freezeTime: true });
    const card = page.locator('.ramadan-card');
    await expect(card).toContainText('ختمات رمضان');
    await expect(card.getByRole('link', { name: 'ختمة واحدة خلال رمضان' })).toHaveAttribute('href', '/new?type=onetime&purpose=ramadan&from=home_ramadan');
    await expect(card.getByRole('link', { name: 'ختمة كاملة كل يوم' })).toHaveAttribute('href', '/new?type=recurring&template=ramadan-daily&from=home_ramadan');

    const later = await browser.newPage();
    await later.clock.setFixedTime(new Date('2026-05-01T09:00:00Z'));
    await openApp(later, '/');
    await expect(later.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();
    await expect(later.locator('.ramadan-card')).toHaveCount(0);
    await later.context().close();
  });

  test('one khitma during Ramadan is due by the last day of Ramadan', async ({ page }) => {
    await recordEventsAcrossReloads(page);
    await openApp(page, '/', { freezeTime: true });
    await page.getByRole('link', { name: 'ختمة واحدة خلال رمضان' }).click();

    await expect(page.getByRole('button', { name: 'في رمضان' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة رمضان');
    await expect(page.getByLabel('تاريخ إتمام الختمة')).toHaveValue('2026-03-19');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill(ADMIN);
    await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();

    const group = await getDoc(`groups/${await createdGroupId(page)}`);
    expect(group).toMatchObject({ title: 'ختمة رمضان', purpose: 'ramadan', targetAt: '2026-03-19' });
    expect(await recordedEvents(page)).toContainEqual(['group_created', expect.objectContaining({ purpose: 'ramadan', source: 'home_ramadan' })]);
  });

  test('a complete khitma every day: the group repeats daily from the start', async ({ page }) => {
    await recordEventsAcrossReloads(page);
    await openApp(page, '/', { freezeTime: true });
    await page.getByRole('link', { name: 'ختمة كاملة كل يوم' }).click();

    await expect(page.getByText('تبدأ ختمة جديدة كل يوم تلقائيًا')).toBeVisible();
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة رمضان اليومية');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill(ADMIN);
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();

    const group = await getDoc(`groups/${await createdGroupId(page)}`);
    expect(group).toMatchObject({ type: 'SEQUENTIAL', purpose: 'ramadan', schedule: { every: 'day', cycleType: AUTO_BOOK } });
    // The next round: midnight in Jerusalem.
    expect(group!.nextRoundAt).toEqual(new Date('2026-03-01T22:00:00Z'));
    expect(await recordedEvents(page)).toContainEqual(['group_created', expect.objectContaining({ template: 'ramadan_daily' })]);
  });

  test('from the 20th of Ramadan, the admin is asked whether the group continues weekly after Eid', async ({ page }) => {
    const groupId = newGroupId('after-ramadan');
    await createSequentialGroup(groupId, { title: 'ختمة رمضان', author: ADMIN, purpose: 'ramadan' });

    // Monday 9 March 2026: the 20th of Ramadan.
    await page.clock.setFixedTime(new Date('2026-03-09T09:00:00Z'));
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    const prompt = page.locator('.after-ramadan');
    await expect(prompt).toContainText('بعد رمضان: هل تستمرّ المجموعة بختمة أسبوعية؟');
    await prompt.getByRole('button', { name: 'نعم، كل جمعة' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'week', weekday: 5, cycleType: AUTO_BOOK });
    // The first weekly round: Friday 20 March (Eid), at midnight in Jerusalem; Ramadan's khitma carries on until then.
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-19T22:00:00Z'));
    await expect(prompt).toHaveCount(0);
    expect(await analyticsEvents(page)).toContainEqual(['after_ramadan_weekly', expect.objectContaining({ action: 'yes' })]);
  });

  test('daily Ramadan khitmas are asked only from Eid, members never, and "later" is remembered', async ({ page, browser }) => {
    const daily = newGroupId('after-ramadan-daily');
    await createSequentialGroup(daily, {
      author: ADMIN, purpose: 'ramadan', schedule: { every: 'day', cycleType: AUTO_BOOK }, nextRoundAt: new Date('2026-03-09T22:00:00Z'),
    });
    const once = newGroupId('after-ramadan-once');
    await createSequentialGroup(once, { author: ADMIN, purpose: 'ramadan' });
    const groups = joinedGroups({ [daily]: ADMIN, [once]: ADMIN });

    await page.clock.setFixedTime(new Date('2026-03-09T09:00:00Z'));
    await openApp(page, `/group/${daily}`, { storage: { groups } });
    await expect(page.getByText(`السلام عليكم يا ${ADMIN}`)).toBeVisible();
    await expect(page.locator('.after-ramadan')).toHaveCount(0);

    await page.goto(`/group/${once}`);
    await page.locator('.after-ramadan').getByRole('button', { name: 'لاحقًا' }).click();
    await expect(page.locator('.after-ramadan')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(`السلام عليكم يا ${ADMIN}`)).toBeVisible();
    await expect(page.locator('.after-ramadan')).toHaveCount(0);

    const member = await browser.newPage();
    await member.clock.setFixedTime(new Date('2026-03-20T09:00:00Z'));
    await openApp(member, `/group/${daily}`, { storage: { groups: joinedGroups({ [daily]: 'سارة' }) } });
    await expect(member.getByText('السلام عليكم يا سارة')).toBeVisible();
    await expect(member.locator('.after-ramadan')).toHaveCount(0);
    await member.context().close();

    // On Eid, the daily khitma's admin is asked.
    const admin = await browser.newPage();
    await admin.clock.setFixedTime(new Date('2026-03-20T09:00:00Z'));
    await openApp(admin, `/group/${daily}`, { storage: { groups: joinedGroups({ [daily]: ADMIN }) } });
    await expect(admin.locator('.after-ramadan')).toBeVisible();
    await admin.context().close();
  });
});
