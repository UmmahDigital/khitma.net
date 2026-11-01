import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Khitmas that stall at 26-29 of 30 are nearly always waiting on bookings nobody finished. Admins see how long each
// juz has been booked, and can free the ones booked a week or more ago.

const { IDLE, BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000 - 60_000);

async function openAsAdmin(page: Page, groupId: string) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
  await expect(page.getByText(`السلام عليكم يا ${ADMIN}`)).toBeVisible();
}

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return { owner: juz.owner ?? '', status: juz.status };
}

test.describe('stale bookings', () => {
  test('the names list shows admins how long each juz has been booked', async ({ page }) => {
    const groupId = newGroupId('stale-age');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: {
        5: { owner: 'سارة', status: BOOKED, updatedAt: daysAgo(9) },
        9: { owner: 'خالد', status: BOOKED, updatedAt: daysAgo(0) },
        12: { owner: 'ليلى', status: BOOKED },
      },
    });

    await openAsAdmin(page, groupId);
    const rows = page.locator('app-juz-list app-juz');
    await expect(rows.nth(4)).toContainText('محجوز منذ 9 أيام');
    await expect(rows.nth(8)).toContainText('حُجز اليوم');
    await expect(rows.nth(11).locator('.booking-age')).toHaveCount(0);

    // Tapping the juz shows the same, before the admin decides.
    await page.locator('app-juz-grid app-juz-toggle').nth(4).click();
    await expect(page.getByRole('dialog')).toContainText('سارة');
    await expect(page.getByRole('dialog')).toContainText('محجوز منذ 9 أيام');
  });

  test('the admin frees bookings a week old or more, after confirming', async ({ page }) => {
    const groupId = newGroupId('stale-release');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: {
        1: { owner: 'خالد', status: DONE, updatedAt: daysAgo(20) },
        5: { owner: 'سارة', status: BOOKED, updatedAt: daysAgo(9) },
        7: { owner: 'ليلى', status: BOOKED, updatedAt: daysAgo(8) },
        9: { owner: 'خالد', status: BOOKED, updatedAt: daysAgo(2) },
      },
    });

    await openAsAdmin(page, groupId);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'إتاحة الأجزاء المتأخّرة (2)' }).click();
    await expect(page.getByRole('dialog')).toContainText('سيُتاح من جديد ما حُجز منذ أسبوع أو أكثر ولم يُتَمّ (جزءان)');
    await page.getByRole('button', { name: 'إتاحتها' }).click();

    await expect(page.getByText('أُتيح جزءان من جديد')).toBeVisible();
    await expect.poll(() => storedJuz(groupId, 5)).toEqual({ owner: '', status: IDLE });
    expect(await storedJuz(groupId, 7)).toEqual({ owner: '', status: IDLE });
    expect(await storedJuz(groupId, 9)).toEqual({ owner: 'خالد', status: BOOKED });
    expect(await storedJuz(groupId, 1)).toEqual({ owner: 'خالد', status: DONE });
    expect(await analyticsEvents(page)).toContainEqual(['stale_bookings_released', expect.objectContaining({ count: 2 })]);
  });

  test('without old bookings there is nothing to release', async ({ page }) => {
    const groupId = newGroupId('stale-none');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED, updatedAt: daysAgo(3) } } });

    await openAsAdmin(page, groupId);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await expect(page.getByRole('button', { name: /إتاحة الأجزاء المتأخّرة/ })).toHaveCount(0);
  });
});
