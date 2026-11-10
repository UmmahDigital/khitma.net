import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { createSameTaskGroup, newGroupId } from '../support/fixtures';

// Light or dark (src/app/theme.ts): the phone's look, until the toolbar button picks the other one.

const ADMIN = 'أبو أحمد';
const LIGHT_PAGE = 'rgb(250, 250, 250)';
const DARK_PAGE = 'rgb(15, 20, 19)';

const pageColor = (page: Page) => page.evaluate(() => getComputedStyle(document.getElementById('app-container')!).backgroundColor);
// One of Material's own colours (_color-scheme.scss), not one of the app's.
const materialBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mat-app-background-color').trim());
const themeButton = (page: Page) => page.getByRole('button', { name: 'الوضع الداكن' });

test('dark can be picked on a light phone, and is kept on the phone until light is picked again', async ({ page }) => {
  await openApp(page, '/');
  await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => pageColor(page)).toBe(LIGHT_PAGE);
  expect(await materialBackground(page)).toBe('#fafafa');

  await themeButton(page).click();
  await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => pageColor(page)).toBe(DARK_PAGE);
  expect(await materialBackground(page)).toBe('#303030');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  expect(await analyticsEvents(page)).toContainEqual(['theme_changed', expect.objectContaining({ theme: 'dark' })]);

  await page.reload();
  await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => pageColor(page)).toBe(DARK_PAGE);

  // Light is this phone's own look: the choice is forgotten, and the app follows the phone again.
  await themeButton(page).click();
  await expect.poll(() => pageColor(page)).toBe(LIGHT_PAGE);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => pageColor(page)).toBe(DARK_PAGE);
  await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'true');
});

test.describe('on a dark phone', () => {
  test.use({ colorScheme: 'dark' });

  test('light can be picked, for pages and dialogs opened later too, and stays when the phone changes', async ({ page }) => {
    const groupId = newGroupId('theme-light');
    await createSameTaskGroup(groupId, { title: 'ورد التجربة', author: ADMIN, members: { [ADMIN]: true, 'سارة': false } });
    await openApp(page, '/', { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    await expect.poll(() => pageColor(page)).toBe(DARK_PAGE);

    await themeButton(page).click();
    await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => pageColor(page)).toBe(LIGHT_PAGE);
    expect(await materialBackground(page)).toBe('#fafafa');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toMatch(/^(only light|light only)$/);

    // The group's page and the menu add their styles after the choice.
    await page.getByRole('link', { name: 'ورد التجربة' }).click();
    const donePanel = page.locator('.member-panel.task-done');
    await expect(donePanel).toHaveCSS('background-color', 'rgb(209, 231, 221)');
    await page.getByRole('button', { name: 'القائمة' }).click();
    await expect(page.locator('.mat-mdc-dialog-surface')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.keyboard.press('Escape');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => pageColor(page)).toBe(LIGHT_PAGE);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

    await page.reload();
    await expect(donePanel).toHaveCSS('background-color', 'rgb(209, 231, 221)');
    await expect.poll(() => pageColor(page)).toBe(LIGHT_PAGE);
  });
});

test.describe('the loading screen, before the app starts', () => {
  for (const [phone, picked, background] of [
    ['light', 'dark', DARK_PAGE],
    ['dark', 'light', LIGHT_PAGE],
  ] as const) {
    test(`is ${picked} on a ${phone} phone when ${picked} is picked`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: phone });
      // Its colour as the page is read, long before the app replaces it.
      await page.addInitScript(() => {
        new MutationObserver((_, observer) => {
          const boot = document.querySelector('main.boot');
          if (boot) {
            (window as any).__bootColor = getComputedStyle(boot).backgroundColor;
            observer.disconnect();
          }
        }).observe(document, { childList: true, subtree: true });
      });
      await openApp(page, '/', { storage: { theme: picked } });
      await expect.poll(() => page.evaluate(() => (window as any).__bootColor)).toBe(background);
    });
  }
});
