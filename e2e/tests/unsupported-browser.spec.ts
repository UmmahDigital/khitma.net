import { expect, test } from '@playwright/test';
import { analyticsEvents, OLD_ANDROID_UA, OLD_IPHONE_UA, openApp, openInTooOldBrowser } from '../support/app';

const SCREEN = '#unsupported-browser';

test.describe('phones too old for the app', () => {
  test.describe('on Android', () => {
    test.use({ userAgent: OLD_ANDROID_UA });

    test('see how to update instead of a blank page', async ({ page }) => {
      await openInTooOldBrowser(page);
      const screen = page.locator(SCREEN);
      await expect(screen.getByRole('heading', { name: 'يحتاج المتصفّح إلى تحديث' })).toBeVisible({ timeout: 10_000 });
      await expect(screen.getByRole('listitem')).toHaveText([
        'حدّث متصفّح Chrome أو Samsung Internet من متجر Google Play.',
        'أو افتح الرابط من هاتف آخر.',
      ]);
      await expect(screen.getByText('التحديث لا يؤثّر على مجموعاتك أو أجزائك.')).toBeVisible();
      expect(await analyticsEvents(page)).toContainEqual(['unsupported_browser', { reason: 'script_error' }]);
    });
  });

  test.describe('on iPhone', () => {
    test.use({ userAgent: OLD_IPHONE_UA });

    test('are told where to update iOS', async ({ page }) => {
      await openInTooOldBrowser(page);
      await expect(page.locator(SCREEN).getByRole('listitem')).toHaveText(
        ['حدّث نظام الهاتف: الإعدادات ← عام ← تحديث البرنامج.', 'أو افتح الرابط من هاتف آخر.'],
        { timeout: 10_000 }
      );
    });
  });
});

test('supported browsers never see the update screen', async ({ page }) => {
  await openApp(page, '/');
  await expect(page.locator('#ayat-count .main-counter')).toBeVisible();
  // The check runs 3s after the page has loaded.
  await page.waitForTimeout(4_000);
  await expect(page.locator(SCREEN)).toBeHidden();
  expect((await analyticsEvents(page)).map(([name]) => name)).not.toContain('unsupported_browser');
});

test('browsers without JavaScript modules see the update screen right away', async ({ page }) => {
  // Emulate a browser from before ES modules: it skips type="module" scripts and runs nomodule ones.
  await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (route) => route.abort());
  await page.route((url) => url.pathname === '/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/type="module"/g, 'type="text/plain"').replace('<script nomodule>', '<script>');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/');
  await expect(page.locator(SCREEN).getByRole('heading', { name: 'يحتاج المتصفّح إلى تحديث' })).toBeVisible();
  expect(await analyticsEvents(page)).toContainEqual(['unsupported_browser', { reason: 'no_modules' }]);
});
