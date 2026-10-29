import { expect, test } from '@playwright/test';
import { analyticsEvents, copiedTexts, joinedGroups, openApp, sharedImage, sharedPayloads } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// An image for WhatsApp Status at the moments people want to share. Every contact who sees the status sees the
// khitma's progress; the caption carries the link.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const REF = 'e2ecards';

test.describe('WhatsApp Status images', () => {
  test('after finishing a juz, the reader shares an image of it, with the link in the caption', async ({ page }) => {
    const groupId = newGroupId('card-juz');
    await createSequentialGroup(groupId, {
      title: 'ختمة العائلة',
      author: ADMIN,
      assigned: { 1: { owner: 'خالد', status: DONE }, 5: { owner: 'سارة', status: BOOKED } },
    });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }), refCode: REF } });
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();
    await page.locator('.next-juz-offer').getByRole('button', { name: 'شارك في حالة واتساب' }).click();

    await expect.poll(async () => (await sharedPayloads(page)).length).toBe(1);
    const [shared] = await sharedPayloads(page);
    expect(shared.text).toBe(
      `أتممتُ قراءة الجزء 5 من ختمة العائلة 🤍\nاختاروا جزءًا وشاركونا الأجر:\nhttp://localhost:4300/group/${groupId}?r=${REF}`
    );
    expect(shared.files).toEqual([{ name: 'khitma-juz.png', type: 'image/png', size: expect.any(Number) }]);
    const image = await sharedImage(page);
    expect([image.width, image.height]).toEqual([1080, 1920]);
    expect(await analyticsEvents(page)).toContainEqual([
      'share',
      expect.objectContaining({ method: 'native_file', content_type: 'card_juz', item_id: groupId }),
    ]);
  });

  test('a completed khitma has one too; without a share sheet for files, it is downloaded and the caption copied', async ({ page }) => {
    const groupId = newGroupId('card-done');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]));
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: ADMIN, assigned });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'عضو 3' }), refCode: REF }, shareSheet: false });
    const download = page.waitForEvent('download');
    await page.locator('.khitma-done').getByRole('button', { name: 'شارك في حالة واتساب' }).click();
    expect((await download).suggestedFilename()).toBe('khitma-complete.png');

    await expect(page.locator('mat-snack-bar-container')).toContainText('تمّ حفظ الصورة ونسخ النص، انشرها في حالتك');
    expect((await copiedTexts(page)).at(-1)).toBe(
      `تمّت ختمة العائلة بفضل الله 🤍\nابدؤوا ختمة جماعيّة لمن تحبّون:\nhttp://localhost:4300/?r=${REF}`
    );
    expect(await analyticsEvents(page)).toContainEqual([
      'share',
      expect.objectContaining({ method: 'download', content_type: 'card_complete', item_id: groupId }),
    ]);
  });
});
