import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp, openedUrls, recordedEvents, recordEventsAcrossReloads, sharedPayloads, whatsappText } from '../support/app';
import { getDoc, setDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId, newRefCode } from '../support/fixtures';

// "Share the reward": every link a member shares carries their phone's anonymous code (?r=…). Joins, ajza read and
// khitmas started through it are counted in refs/{code}, and the sharer sees what their invitations brought about.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const HADITH = '«مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ» (رواه مسلم)';

async function joinAs(page: Page, groupId: string, name: string) {
  await page.getByLabel('اسمك').fill(name);
  await page.getByRole('button', { name: 'الإنضمام للختمة' }).click();
  await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`), { timeout: 20_000 });
  await expect(page.getByText(`السلام عليكم يا ${name}`)).toBeVisible();
}

async function readJuz(page: Page, juzNumber: number) {
  await page.locator('app-juz-grid app-juz-toggle').nth(juzNumber - 1).click();
  await page.getByRole('button', { name: `أتممت قراءة جزء ${juzNumber}` }).click();
  await page.getByRole('button', { name: 'نعم' }).click();
}

test.describe('share the reward', () => {
  test('the status message carries the sharer’s reference too', async ({ page }) => {
    const sharer = newRefCode();
    const groupId = newGroupId('ref-status');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 2: { owner: 'سارة', status: BOOKED } } });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }), refCode: sharer } });
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();
    const [shared] = await sharedPayloads(page);
    expect(shared.text).toContain(`http://localhost:4300/group/${groupId}?r=${sharer}`);
  });

  test('joining and reading through a shared link count for the sharer, and nothing else is stored', async ({ page }) => {
    const sharer = newRefCode();
    const groupId = newGroupId('ref-join');
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: ADMIN });
    await recordEventsAcrossReloads(page);

    await openApp(page, `/group/${groupId}?r=${sharer}`);
    // The reference is taken out of the address, so it isn't passed on.
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/join$`));
    await joinAs(page, groupId, 'سارة');
    expect(await getDoc(`refs/${sharer}`)).toMatchObject({ joined: 1 });

    await readJuz(page, 3);
    await expect.poll(async () => (await getDoc(`refs/${sharer}`))?.read).toBe(1);
    // Counts only: no names, no group.
    expect(Object.keys((await getDoc(`refs/${sharer}`))!).sort()).toEqual(['id', 'joined', 'read', 'updatedAt']);

    const events = await recordedEvents(page);
    // The visit is attributed to sharing in analytics, though the link itself only carried ?r=.
    expect(events).toContainEqual([
      'page_view',
      expect.objectContaining({ page_location: `http://localhost:4300/group/${groupId}/join?utm_source=member_share&utm_medium=referral` }),
    ]);
    expect(events.map(([name]) => name)).toContain('referral_open');
    expect(events).toContainEqual(['referral_credit', expect.objectContaining({ kind: 'joined' })]);
    expect(events).toContainEqual(['referral_credit', expect.objectContaining({ kind: 'read' })]);
  });

  test('a member’s own link counts for nobody, and neither does a member who was already in the group', async ({ page, browser }) => {
    const [sharer, otherSharer] = [newRefCode(), newRefCode()];
    const groupId = newGroupId('ref-self');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 4: { owner: 'خالد', status: BOOKED } } });

    await openApp(page, `/group/${groupId}?r=${sharer}`, { storage: { refCode: sharer } });
    await joinAs(page, groupId, 'سارة');
    expect(await getDoc(`refs/${sharer}`)).toBeNull();

    const member = await (await browser.newContext()).newPage();
    await openApp(member, `/group/${groupId}?r=${otherSharer}`, { storage: { groups: joinedGroups({ [groupId]: 'خالد' }) } });
    await expect(member.getByText('السلام عليكم يا خالد')).toBeVisible();
    await readJuz(member, 4);
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.ajza['3'].status).toBe(DONE);
    expect(await getDoc(`refs/${otherSharer}`)).toBeNull();
    await member.context().close();
  });

  test('someone who came through a link and starts a khitma of their own counts as a new khitma', async ({ page }) => {
    const sharer = newRefCode();
    const groupId = newGroupId('ref-start');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openApp(page, `/group/${groupId}?r=${sharer}`);
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/join$`));
    await page.goto('/new?type=onetime');
    await page.getByLabel('عنوان الختمة').fill('ختمة عن روح جدّي');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill('سارة');
    await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);

    await expect.poll(async () => (await getDoc(`refs/${sharer}`))?.started).toBe(1);
  });

  test('the sharer sees what their invitations brought about, at home and next to the invite button', async ({ page }) => {
    const sharer = newRefCode();
    await setDoc(`refs/${sharer}`, { joined: 7, read: 12, started: 1 });
    const groupId = newGroupId('ref-impact');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 1: { owner: 'سارة', status: DONE } } });

    await openApp(page, '/', { storage: { refCode: sharer, refShared: '1', groups: joinedGroups({ [groupId]: 'سارة' }) } });
    const card = page.locator('.impact-card');
    await expect(card).toContainText('أثر دعواتك 🤍');
    await expect(card).toContainText('انضمّ عبر دعواتك 7 أشخاص، وقرؤوا 12 جزءًا.');
    await expect(card).toContainText('وبدأ واحد منهم ختمة جديدة.');
    await expect(card).toContainText(HADITH);

    await page.goto(`/group/${groupId}`);
    await expect(page.locator('.help-finish-impact')).toHaveText('🤍 انضمّ عبر دعواتك 7 أشخاص، وقرؤوا 12 جزءًا.');
    // Sharing again carries the same reference.
    await page.locator('.help-finish').getByRole('button', { name: 'إرسال عبر واتساب' }).click();
    expect(whatsappText((await openedUrls(page))[0])).toContain(`/group/${groupId}?r=${sharer}`);
  });

  test('nothing is looked up for a phone that never shared, and other languages get one line per number', async ({ page, browser }) => {
    const sharer = newRefCode();
    await setDoc(`refs/${sharer}`, { joined: 3, read: 5 });

    await openApp(page, '/', { storage: { refCode: sharer } });
    await expect(page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();
    await expect(page.locator('.impact-card')).toHaveCount(0);

    const english = await (await browser.newContext()).newPage();
    await openApp(english, '/', { storage: { refCode: sharer, refShared: '1', lng: 'en' } });
    const card = english.locator('.impact-card');
    await expect(card).toContainText('What your invitations brought 🤍');
    await expect(card).toContainText('Joined through your invitations: 3');
    await expect(card).toContainText('Juz they read: 5');
    await english.context().close();
  });
});
