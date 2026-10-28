import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp, recordedEvents, recordEventsAcrossReloads } from '../support/app';
import { createSameTaskGroup, createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Google Analytics calls the app makes (gtag.js itself is blocked in tests, so calls stay in dataLayer).

const { BOOKED, DONE } = JUZ_STATUS;

async function gtagCalls(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => ((window as any).dataLayer ?? []).map((args: IArguments) => Array.from(args)));
}

async function events(page: Page) {
  return (await gtagCalls(page)).filter((call) => call[0] === 'event');
}

async function pageViewTitles(page: Page) {
  return (await events(page)).filter((call) => call[1] === 'page_view').map((call) => (call[2] as any).page_title);
}

test.describe('analytics', () => {
  test('configures GA once, without its automatic page view, and loads gtag.js only once', async ({ page }) => {
    await openApp(page, '/');
    await expect(page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();

    await expect.poll(async () => (await gtagCalls(page)).filter((call) => call[0] === 'config'))
      .toEqual([['config', 'G-E2ETEST000', { send_page_view: false }]]);
    await expect(page.locator('head script[src="https://www.googletagmanager.com/gtag/js?id=G-E2ETEST000"]')).toHaveCount(1);
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(1);
  });

  test('sends one page view per screen, named by the screen and never by the group', async ({ page }) => {
    const groupId = newGroupId('ga-pv');
    await createSequentialGroup(groupId, { title: 'ختمة عن روح الوالد فلان', author: 'أبو أحمد' });

    await openApp(page, '/', { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect.poll(() => pageViewTitles(page)).toEqual(['home']);

    await page.getByText('ختمة عن روح الوالد فلان').click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`));
    await expect(page).toHaveTitle('ختمة عن روح الوالد فلان');
    await expect.poll(() => pageViewTitles(page)).toEqual(['home', 'group_dashboard']);
    expect((await events(page)).find((call) => (call[2] as any)?.page_title === 'group_dashboard')![2]).toMatchObject({
      page_location: `http://localhost:4300/group/${groupId}/dashboard`,
    });

    // The tab shows the group's name; GA must never receive it.
    expect(JSON.stringify(await gtagCalls(page))).not.toContain('فلان');
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

  test('group events carry the group, its type and the member’s role', async ({ page }) => {
    const sequentialId = newGroupId('ga-seq');
    const sameTaskId = newGroupId('ga-same');
    await createSequentialGroup(sequentialId, { author: 'أبو أحمد' });
    await createSameTaskGroup(sameTaskId, { author: 'أبو أحمد', task: 'سورة الملك', members: { 'أبو أحمد': false, 'سارة': false } });
    const storage = { groups: joinedGroups({ [sequentialId]: 'سارة', [sameTaskId]: 'سارة' }) };

    await openApp(page, `/group/${sequentialId}`, { storage });
    await page.locator('app-juz-grid app-juz-toggle').nth(6).click();
    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'juz_selected',
      { group_id: sequentialId, group_type: 'SEQUENTIAL', role: 'member', cycle: 0 },
    ]);

    await page.goto(`/group/${sameTaskId}`);
    await page.locator('app-todo label.todo').click();
    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'task_done',
      { group_id: sameTaskId, group_type: 'SAME_TASK', role: 'member', cycle: 0, event_category: 'tasks', event_label: 'سورة الملك' },
    ]);
  });

  test('leaving a group page stops sending its context', async ({ page }) => {
    const groupId = newGroupId('ga-leave-ctx');
    await createSequentialGroup(groupId, { author: 'أبو أحمد' });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
    await page.getByRole('link', { name: 'ختمة.نت' }).click();
    await page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' }).click();

    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'recurring_khitma_button_click',
      { event_category: 'home_page_buttons' },
    ]);
  });

  test('shares record what was shared and how', async ({ page }) => {
    const groupId = newGroupId('ga-share');
    await createSequentialGroup(groupId, { author: 'أبو أحمد' });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'أبو أحمد' }) } });
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    await expect.poll(() => events(page)).toContainEqual([
      'event',
      'share',
      { group_id: groupId, group_type: 'SEQUENTIAL', role: 'admin', cycle: 0, method: 'native', content_type: 'status', item_id: groupId },
    ]);
  });

  test('finishing the last juz records a completed khitma, once', async ({ page }) => {
    const groupId = newGroupId('ga-complete');
    const assigned = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'سارة', status: i === 4 ? BOOKED : DONE }])
    );
    await createSequentialGroup(groupId, { author: 'أبو أحمد', assigned });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();

    await expect(page.locator('app-khitma-done-celebration')).toBeVisible();
    expect((await events(page)).filter((call) => call[1] === 'khitma_completed')).toEqual([
      ['event', 'khitma_completed', { group_id: groupId, group_type: 'SEQUENTIAL', role: 'member', cycle: 0, completed_by: 'member' }],
    ]);
  });

  test('creating a group records its type', async ({ page }) => {
    await openApp(page, '/new?type=recurring');
    await page.getByLabel('عنوان الختمة').fill('ختمة الجمعة');
    await page.getByLabel('اسمك (مسؤول الختمة)').fill('أبو محمد');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();
    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);

    const groupId = new URL(page.url()).pathname.split('/')[2];
    await expect.poll(() => events(page)).toContainEqual(['event', 'group_created', { group_id: groupId, group_type: 'SEQUENTIAL' }]);
  });

  test('joining a group records its type, even though the app reloads right after', async ({ page }) => {
    const groupId = newGroupId('ga-join');
    await createSequentialGroup(groupId, { author: 'أبو أحمد' });

    await recordEventsAcrossReloads(page);
    await openApp(page, `/group/${groupId}`);
    await page.getByLabel('اسمك').fill('سارة');
    await page.getByRole('button', { name: 'الإنضمام للختمة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`), { timeout: 20_000 });

    expect(await recordedEvents(page)).toContainEqual(['group_joined', { group_id: groupId, group_type: 'SEQUENTIAL' }]);
  });
});
