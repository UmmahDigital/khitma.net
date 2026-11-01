import { expect, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

const ADMIN = 'أبو أحمد';
const { BOOKED, DONE } = JUZ_STATUS;

test.describe('the juz grid', () => {
  test('is a set of buttons a screen reader can name, and a keyboard can use', async ({ page }) => {
    const groupId = newGroupId('a11y-grid');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: { 1: { owner: 'خالد', status: DONE }, 2: { owner: 'خالد', status: BOOKED }, 5: { owner: 'سارة', status: BOOKED } },
    });
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    const grid = page.locator('app-juz-grid');

    await expect(grid.getByRole('button', { name: 'الجزء 1، تمّت قراءته (خالد)' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'الجزء 2، محجوز باسم خالد' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'الجزء 5، محجوز لك' })).toBeVisible();

    await grid.getByRole('button', { name: 'الجزء 7، متاح', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.ajza['6']).toMatchObject({ owner: 'سارة', status: BOOKED });
  });

  test('marks booked and finished ajza, not only by colour', async ({ page }) => {
    const groupId = newGroupId('a11y-marks');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 1: { owner: 'خالد', status: DONE }, 2: { owner: 'سارة', status: BOOKED } } });
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    const toggles = page.locator('app-juz-grid app-juz-toggle');

    await expect(toggles.nth(0).locator('.juz-check')).toBeVisible();
    await expect(toggles.nth(1).locator('.juz-booked-mark')).toBeVisible();
    await expect(toggles.nth(2).locator('.juz-mark')).toHaveCount(0);
  });
});
