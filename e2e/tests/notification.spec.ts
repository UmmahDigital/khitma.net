import { expect, Page, test } from '@playwright/test';
import { openApp, OUTSIDE_RAMADAN, readLocalStorage } from '../support/app';

// The announcement behind the bell (the latest document in `notifications`, seeded in support/fixtures.ts).

async function openAnnouncement(page: Page) {
  await expect(page.locator('.mat-badge-content')).toBeVisible();
  await page.locator('mat-icon[gaevent="show_notification_clicked"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'مجتمع ختمة.نت' })).toBeVisible();
  // Measured once it has finished zooming in.
  await expect
    .poll(() => dialog.locator('.mat-mdc-dialog-surface').evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  return dialog;
}

test.describe('the announcement', () => {
  test('stacks its actions with room between them, at a readable width on a wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page, '/', { now: OUTSIDE_RAMADAN });
    const dialog = await openAnnouncement(page);

    expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(440);
    const [first, second] = [dialog.getByRole('link', { name: 'ابدأ ختمة جديدة' }), dialog.getByRole('link', { name: 'مجموعة الفيسبوك' })];
    const firstBox = (await first.boundingBox())!;
    const secondBox = (await second.boundingBox())!;
    expect(secondBox.y - (firstBox.y + firstBox.height)).toBeGreaterThanOrEqual(8);
    expect(secondBox.width).toBeCloseTo(firstBox.width, 0);
    // The dialog takes the focus, so the close button doesn't open highlighted.
    const close = dialog.getByRole('button', { name: 'إغلاق' });
    await expect(close).toBeVisible();
    await expect(close).not.toBeFocused();
  });

  test('a link within the app opens without reloading it, and the announcement counts as read', async ({ page }) => {
    await openApp(page, '/', { now: OUTSIDE_RAMADAN });
    const dialog = await openAnnouncement(page);
    await page.evaluate(() => ((window as any).__samePage = true));

    await dialog.getByRole('link', { name: 'ابدأ ختمة جديدة' }).click();

    await expect(page).toHaveURL(/\/new\?type=onetime&from=notification$/);
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => (window as any).__samePage)).toBe(true);
    await expect(page.locator('.mat-badge-content')).toBeHidden();
    expect(await readLocalStorage(page, 'lastRecievedNotificationId')).toBe(2);
  });

  test('in English the dialog reads left to right, and an Arabic announcement keeps its own direction', async ({ page }) => {
    await openApp(page, '/', { storage: { lng: 'en' }, now: OUTSIDE_RAMADAN });
    const dialog = await openAnnouncement(page);

    const close = (await dialog.getByRole('button', { name: 'Close' }).boundingBox())!;
    const box = (await dialog.boundingBox())!;
    expect(close.x).toBeGreaterThan(box.x + box.width / 2);
    expect(await dialog.evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
    expect(await dialog.getByRole('heading').evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    expect(await dialog.getByRole('link', { name: 'ابدأ ختمة جديدة' }).evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    // The title's text keeps clear of the close button.
    const titleEnd = await dialog.getByRole('heading').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    });
    expect(titleEnd).toBeLessThanOrEqual(close.x + 1);
  });
});
