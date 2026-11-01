import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// What goes wrong on people's phones reaches analytics (src/app/field-reports.ts), without names or titles.

const eventsNamed = async (page: Page, name: string) => (await analyticsEvents(page)).filter(([event]) => event === name);

test('an error nobody handled is reported, without the words people typed', async ({ page }) => {
  await openApp(page, '/');
  await expect(page.locator('#ayat-count .main-counter')).toBeVisible();

  await page.evaluate(() => setTimeout(() => {
    throw new Error('Test failure for «سارة»');
  }));

  await expect
    .poll(() => eventsNamed(page, 'app_error'))
    .toContainEqual(['app_error', expect.objectContaining({ error_message: 'Test failure for …', error_source: 'window' })]);
});

test('a dialog whose buttons end up off the screen is reported', async ({ page }) => {
  const groupId = newGroupId('field-offscreen');
  await createSequentialGroup(groupId, { author: 'أبو أحمد', assigned: { 5: { owner: 'سارة', status: JUZ_STATUS.BOOKED } } });
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
  const finish = page.getByRole('button', { name: 'أتممت قراءة جزء 5' });
  const dialog = page.getByRole('dialog');

  // A dialog that fits sends nothing.
  await finish.click();
  await expect(dialog).toHaveClass(/\bmdc-dialog--open\b/);
  await expect(dialog).not.toHaveClass(/\bmdc-dialog--opening\b/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await eventsNamed(page, 'dialog_offscreen')).toEqual([]);

  // Pushed below the screen, as on the phone where this was first seen.
  await page.addStyleTag({ content: '.mat-mdc-dialog-container { transform: translateY(100vh); }' });
  await finish.click();
  await expect
    .poll(() => eventsNamed(page, 'dialog_offscreen'))
    .toEqual([
      ['dialog_offscreen', expect.objectContaining({ dialog: 'app-confirm-dialog', viewport: '390x844', overflow_px: expect.any(Number) })],
    ]);
});
