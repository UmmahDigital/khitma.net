import { expect, Page, test } from '@playwright/test';
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

test('the text size in the menu sets every text size, and is kept on the phone', async ({ page }) => {
  await openApp(page, '/');
  const rootSize = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  await expect.poll(rootSize).toBe('18px');

  await page.getByRole('button', { name: 'القائمة' }).click();
  await page.getByRole('button', { name: 'تكبير النص' }).click();
  await page.getByRole('button', { name: 'تكبير النص' }).click();
  await expect.poll(rootSize).toBe('22.4px');
  await expect(page.getByRole('button', { name: 'تكبير النص' })).toBeDisabled();

  await page.reload();
  await expect.poll(rootSize).toBe('22.4px');
  expect(await page.evaluate(() => localStorage.getItem('textSize'))).toBe('xl');
});

// Older readers tap beside small icons: the toolbar's buttons answer taps around their icon, and the keyboard.
test.describe('the toolbar', () => {
  const tapAt = (page: Page, x: number, y: number) => page.mouse.click(x, y);

  test('☰ opens the menu from anywhere on its button, and with the keyboard', async ({ page }) => {
    await openApp(page, '/', { storage: { lastRecievedNotificationId: '2' } });
    const menu = page.getByRole('button', { name: 'القائمة' });
    const box = (await menu.boundingBox())!;
    await tapAt(page, box.x + 3, box.y + box.height / 2);
    await expect(page.getByRole('link', { name: 'عن البرنامج' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'عن البرنامج' })).toBeVisible();
  });

  test('the globe and the bell are buttons that also answer taps around their icon', async ({ page }) => {
    await openApp(page, '/');
    await expect(page.locator('.mat-badge-content')).toBeVisible();
    const toolbar = (await page.locator('mat-toolbar').boundingBox())!;
    const globe = page.getByRole('button', { name: 'اللغة' });
    const bell = page.getByRole('button', { name: 'الإشعارات' });
    const theme = page.getByRole('button', { name: 'الوضع الداكن' });
    const g = (await globe.boundingBox())!;
    const b = (await bell.boundingBox())!;
    // Where they always were: 24px icons, 8px apart (right to left).
    expect([g.width, g.height, b.width, b.height]).toEqual([24, 24, 24, 24]);
    expect(g.x - (b.x + b.width)).toBe(8);

    // Below the globe's icon, near the toolbar's edge; then just beside it, on the side of the dark mode button.
    for (const [x, y] of [
      [g.x + g.width / 2, toolbar.y + toolbar.height - 2],
      [g.x + g.width + 2, g.y + g.height / 2],
    ]) {
      await tapAt(page, x, y);
      await expect(page.getByRole('menuitem', { name: 'English' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menuitem')).toHaveCount(0);
    }
    await expect(theme).toHaveAttribute('aria-pressed', 'false');

    // In the gap between the bell and the globe, closer to the bell.
    await tapAt(page, b.x + b.width + 3, b.y + b.height / 2);
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'مجتمع ختمة.نت' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // And with the keyboard.
    await globe.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'English' })).toBeVisible();
  });
});
