import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// When a khitma completes (or a member finishes and nothing is left to take), everyone is invited to start a khitma
// of their own: members who become organisers are how khitma.net grows.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

async function openDashboard(page: Page, groupId: string, username: string, storage: Record<string, unknown> = {}) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }), ...storage } });
}

test.describe('starting a khitma of your own', () => {
  test('a completed khitma invites members to start one for someone they love', async ({ page }) => {
    const groupId = newGroupId('own-complete');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'خالد', status: DONE }]));
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openDashboard(page, groupId, 'سارة');
    const invite = page.locator('.khitma-done .start-own');
    await expect(invite).toContainText('هل تودّ أن تبدأ ختمة جماعيّة لمن تحب؟');
    await invite.getByRole('link', { name: 'ابدأ ختمة جديدة' }).click();

    await expect(page).toHaveURL(/\/new\?type=onetime\.sequential&from=completion$/);
    expect(await analyticsEvents(page)).toContainEqual([
      'start_own_khitma_click',
      expect.objectContaining({ source: 'completion', group_id: groupId }),
    ]);
    await page.getByLabel('عنوان الختمة').fill('ختمة عن روح الجدّة');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill('سارة');
    await page.getByRole('button', { name: 'إنشاء الختمة الجماعيّة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    expect(await analyticsEvents(page)).toContainEqual([
      'group_created',
      expect.objectContaining({ group_type: 'SEQUENTIAL', source: 'completion' }),
    ]);
  });

  test('after finishing a juz with none left to take, the member is invited too', async ({ page }) => {
    const groupId = newGroupId('own-after-juz');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'خالد', status: BOOKED }]));
    assigned[5] = { owner: 'سارة', status: BOOKED };
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openDashboard(page, groupId, 'سارة');
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();

    const card = page.locator('.next-juz-offer');
    await expect(card).toContainText('جزاكم الله خيرًا');
    await expect(card.getByRole('link', { name: 'ابدأ ختمة جديدة' })).toHaveAttribute('href', '/new?type=onetime.sequential&from=juz_done');
  });

  test('the new-khitma dialog speaks the reader’s language', async ({ page }) => {
    const groupId = newGroupId('own-dialog-en');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openDashboard(page, groupId, ADMIN, { lng: 'en' });
    await page.locator('.admin-tools mat-expansion-panel-header').click();
    await page.locator('.admin-tools button').filter({ hasText: /new/i }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Give every member their next juz automatically');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'OK' })).toBeVisible();
  });
});
