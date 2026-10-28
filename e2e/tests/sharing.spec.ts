import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, copiedTexts, joinedGroups, openApp, openedUrls, sharedPayloads, whatsappText } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Sharing is how khitmas grow: most members arrive from a WhatsApp link.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const HADITH = '«مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ» (رواه مسلم)';
// The sharer's reference, carried by every link they share (see referrals.spec.ts).
const REF = 'e2eshare';

async function openDashboard(page: Page, groupId: string, username: string, shareSheet = true) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }), refCode: REF }, shareSheet });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

test.describe('sharing', () => {
  test('a new group is sent on WhatsApp in one tap, with a clean invite', async ({ page }) => {
    await openApp(page, '/new?type=recurring', { storage: { refCode: REF } });
    await page.getByLabel('عنوان الختمة').fill('ختمة الجمعة');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill('أبو محمد');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const groupId = new URL(page.url()).pathname.split('/')[2];

    await expect(page.getByRole('heading', { name: 'ادعُ أهلك وأصدقاءك' })).toBeVisible();
    await page.getByRole('button', { name: 'إرسال عبر واتساب' }).click();

    const [url] = await openedUrls(page);
    expect(whatsappText(url)).toBe(
      ['انضمّوا إلى ختمة «ختمة الجمعة»، واختاروا جزءًا لقراءته 📖', `http://localhost:4300/group/${groupId}?r=${REF}`, '', HADITH].join('\n')
    );
    expect(await analyticsEvents(page)).toContainEqual(['share', { method: 'whatsapp', content_type: 'invite', item_id: groupId }]);
  });

  test('without a share sheet, sharing copies the message and offers WhatsApp', async ({ page }) => {
    const groupId = newGroupId('share-copy');
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: ADMIN });

    await openDashboard(page, groupId, ADMIN, false);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    const snackBar = page.locator('mat-snack-bar-container');
    await expect(snackBar).toContainText('تمّ نسخ الرسالة');
    expect((await copiedTexts(page))[0]).toContain(`http://localhost:4300/group/${groupId}`);

    await snackBar.getByRole('button', { name: 'واتساب' }).click();
    expect(whatsappText((await openedUrls(page))[0])).toContain('ختمة العائلة');
  });

  test('members are asked to fill exactly the ajza that have no reader', async ({ page }) => {
    const groupId = newGroupId('share-free');
    const assigned = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]).filter(([n]) => ![4, 9, 30].includes(n as number))
    );
    await createSequentialGroup(groupId, { title: 'ختمة عن روح الوالد', author: ADMIN, assigned });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.locator('.help-finish')).toContainText('بقي 3 أجزاء بلا قارئ');
    await page.locator('.help-finish').getByRole('button', { name: 'إرسال عبر واتساب' }).click();

    expect(whatsappText((await openedUrls(page))[0])).toBe(
      [
        'ساعدونا في إتمام ختمة «ختمة عن روح الوالد» 🤍',
        'بقي 3 أجزاء بلا قارئ: 4، 9، 30',
        'اختاروا جزءًا من الرابط:',
        `http://localhost:4300/group/${groupId}?r=${REF}`,
        '',
        HADITH,
      ].join('\n')
    );
    expect(await analyticsEvents(page)).toContainEqual([
      'share',
      expect.objectContaining({ method: 'whatsapp', content_type: 'free_juz', item_id: groupId }),
    ]);
  });

  test('Arabic counts read naturally', async ({ page }) => {
    const groupId = newGroupId('share-counts');
    const assigned = Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, { owner: 'خالد', status: DONE }]));
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.locator('.help-finish')).toContainText('بقي جزء واحد بلا قارئ');
  });

  test('when every juz is taken, the admin can remind whoever is still reading', async ({ page }) => {
    const groupId = newGroupId('share-remind');
    const assigned = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: i < 5 ? BOOKED : DONE }])
    );
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: ADMIN, assigned });

    await openDashboard(page, groupId, ADMIN);
    await expect(page.locator('.help-finish')).toContainText('كلّ الأجزاء محجوزة، و5 أجزاء قيد القراءة');
    await page.getByRole('button', { name: 'ذكّر القرّاء عبر واتساب' }).click();

    const text = whatsappText((await openedUrls(page))[0]);
    expect(text).toContain('🟢 تمّ 25 · 🟡 قيد القراءة 5 · 🔴 متاح 0');
    expect(text).toContain('01 🟡 عضو 1');
  });

  test('members see no reminder card when every juz is taken', async ({ page }) => {
    const groupId = newGroupId('share-member-full');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'خالد', status: BOOKED }]));
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByText('جميع الأجزاء في هذه المجموعة محجوزة.')).toBeVisible();
    await expect(page.locator('.help-finish')).toHaveCount(0);
  });

  test('the status message starts with what is left', async ({ page }) => {
    const groupId = newGroupId('share-status');
    await createSequentialGroup(groupId, {
      title: 'ختمة العائلة',
      author: ADMIN,
      assigned: { 1: { owner: 'سارة', status: DONE }, 2: { owner: 'خالد', status: BOOKED } },
    });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    const lines = (await sharedPayloads(page))[0].text!.split('\n');
    expect(lines[3]).toBe('🟢 تمّ 1 · 🟡 قيد القراءة 1 · 🔴 متاح 28');
    expect(lines[4]).toBe('الأجزاء المتاحة: ' + Array.from({ length: 28 }, (_, i) => i + 3).join('، '));
  });
});
