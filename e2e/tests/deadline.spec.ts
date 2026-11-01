import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp, openedUrls, whatsappText } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, newGroupId } from '../support/fixtures';

// A deadline from the start, for one-time khitmas: groups with one finish far more often. A recurring khitma has no
// single end date, so it isn't asked. The clock is frozen on Sunday 1 March 2026.

const ADMIN = 'أبو أحمد';

async function createGroup(page: Page, choose: () => Promise<void>) {
  await openApp(page, '/new?type=onetime', { freezeTime: true });
  await page.getByLabel('عنوان الختمة').fill('ختمة العائلة');
  await page.getByLabel('اسمك (مسؤول المجموعة)').fill('أبو محمد');
  await choose();
  await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();
  await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
  return new URL(page.url()).pathname.split('/')[2];
}

test.describe('deadline', () => {
  test('choosing Friday sets the date, and the group page counts down to it', async ({ page }) => {
    const groupId = await createGroup(page, () => page.getByRole('button', { name: 'الجمعة', exact: true }).click());
    expect(await getDoc(`groups/${groupId}`)).toMatchObject({ targetAt: '2026-03-06', targetDate: 'الجمعة 6/3/2026' });

    await page.getByRole('link', { name: 'الانتقال لصفحة مجموعة الختمة' }).click();
    await expect(page.locator('.deadline-line')).toHaveText('⏳ موعد إتمام الختمة: الجمعة 6/3/2026 — بعد 5 أيام');

    // The help message carries it too.
    await page.locator('.help-finish').getByRole('button', { name: 'إرسال عبر واتساب' }).click();
    expect(whatsappText((await openedUrls(page))[0])).toContain('⏳ موعد إتمام الختمة: الجمعة 6/3/2026 — بعد 5 أيام');
  });

  test('another date can be picked', async ({ page }) => {
    const groupId = await createGroup(page, async () => {
      await page.getByRole('button', { name: 'أو اختر تاريخًا آخر' }).click();
      await page.getByLabel('تاريخ إتمام الختمة').fill('2026-03-15');
    });
    expect(await getDoc(`groups/${groupId}`)).toMatchObject({ targetAt: '2026-03-15', targetDate: 'الأحد 15/3/2026' });
  });

  test('there is no deadline unless one is chosen', async ({ page }) => {
    const groupId = await createGroup(page, async () => {});
    const group = await getDoc(`groups/${groupId}`);
    expect(group!.targetAt).toBeUndefined();
    expect(group!.targetDate).toBeUndefined();
  });

  test('only one-time khitmas are asked for a deadline', async ({ page }) => {
    const question = page.getByRole('heading', { name: 'متى تريدون إتمام الختمة؟' });
    await openApp(page, '/new?type=onetime', { freezeTime: true });
    await expect(question).toBeVisible();
    await page.goto('/new?type=recurring');
    await expect(page.getByLabel('عنوان الختمة')).toBeVisible();
    await expect(question).toHaveCount(0);
  });

  test('a deadline picked for a one-time khitma is dropped when the form switches to recurring', async ({ page }) => {
    const question = page.getByRole('heading', { name: 'متى تريدون إتمام الختمة؟' });
    await openApp(page, '/new', { freezeTime: true });
    await page.getByRole('radio', { name: 'ختمة لمرّة واحدة' }).click();
    await page.getByRole('button', { name: 'أسبوع', exact: true }).click();
    await page.getByRole('radio', { name: 'ختمة دوريّة' }).click();
    await expect(question).toHaveCount(0);

    await page.getByLabel('عنوان الختمة').fill('ختمة الجمعة');
    await page.getByLabel('اسمك (مسؤول المجموعة)').fill('أبو محمد');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const group = await getDoc(`groups/${new URL(page.url()).pathname.split('/')[2]}`);
    expect(group!.targetAt).toBeUndefined();
    expect(group!.targetDate).toBeUndefined();
    expect(await analyticsEvents(page)).toContainEqual(['group_created', expect.objectContaining({ deadline: 'none' })]);
  });

  test('a date typed in the edit dialog shows as typed, and replaces the picked one', async ({ page }) => {
    const groupId = newGroupId('deadline-edit');
    await createSequentialGroup(groupId, { author: ADMIN, targetAt: '2026-03-06', targetDate: 'الجمعة 6/3/2026' });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) }, freezeTime: true });
    await expect(page.locator('.deadline-line')).toContainText('بعد 5 أيام');
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تعديل تفاصيل الختمة' }).click();
    await page.getByRole('dialog').getByLabel('موعد إتمام الختمة').fill('بعد العيد');
    await page.getByRole('button', { name: 'حفظ التغييرات' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.targetAt).toBeUndefined();
    await expect(page.locator('.deadline-line')).toHaveText('⏳ موعد إتمام الختمة: بعد العيد');
  });
});
