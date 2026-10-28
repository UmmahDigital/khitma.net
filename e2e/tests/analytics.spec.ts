import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { createSameTaskGroup, createSequentialGroup, newGroupId } from '../support/fixtures';

// Google Analytics calls the app makes (gtag.js itself is blocked in tests, so calls stay in dataLayer).

async function gtagCalls(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => ((window as any).dataLayer ?? []).map((args: IArguments) => Array.from(args)));
}

async function events(page: Page) {
  return (await gtagCalls(page)).filter((call) => call[0] === 'event');
}

test.describe('analytics', () => {
  test('configures the measurement IDs and loads gtag.js on startup', async ({ page }) => {
    await openApp(page, '/');
    await expect(page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();

    await expect.poll(async () => (await gtagCalls(page)).filter((call) => call[0] === 'config').map((call) => call[1]))
      .toEqual(['G-QXJ6QZFWZL', 'G-E2ETEST000']);
    await expect(page.locator('head script[src="https://www.googletagmanager.com/gtag/js?id=G-E2ETEST000"]')).toHaveCount(1);
  });

  test('home buttons send click events with their category', async ({ page }) => {
    await openApp(page, '/');
    await page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' }).click();

    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'recurring_khitma_button_click',
      { event_category: 'home_page_buttons' },
    ]);
  });

  test('group actions send events with category and label', async ({ page }) => {
    const sequentialId = newGroupId('ga-seq');
    const sameTaskId = newGroupId('ga-same');
    await createSequentialGroup(sequentialId, { author: 'أبو أحمد' });
    await createSameTaskGroup(sameTaskId, { author: 'أبو أحمد', task: 'سورة الملك', members: { 'أبو أحمد': false, 'سارة': false } });
    const storage = { groups: joinedGroups({ [sequentialId]: 'سارة', [sameTaskId]: 'سارة' }) };

    await openApp(page, `/group/${sequentialId}`, { storage });
    await page.locator('app-juz-grid app-juz-toggle').nth(6).click();
    await expect.poll(() => events(page)).toContainEqual(['event', 'juz_selected']);

    await page.goto(`/group/${sameTaskId}`);
    await page.locator('app-todo label.todo').click();
    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'task_done',
      { event_category: 'tasks', event_label: 'سورة الملك' },
    ]);
  });
});
