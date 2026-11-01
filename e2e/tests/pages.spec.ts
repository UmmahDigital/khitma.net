import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp, sharedPayloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createPagesGroup, newGroupId } from '../support/fixtures';

const ADMIN = 'أبو أحمد';

async function openDashboard(page: Page, groupId: string, username: string) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }) } });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

async function storedPages(groupId: string) {
  const group = await getDoc(`groups/${groupId}`);
  return {
    isStarted: group!.isStarted ?? false,
    members: Object.fromEntries(
      Object.entries<any>(group!.members).map(([name, m]) => [
        name,
        { done: m.isTaskDone, pages: m.pagesTask ? [m.pagesTask.start, m.pagesTask.end] : null },
      ])
    ),
  };
}

test.describe('page distribution group', () => {
  test('members wait until the admin distributes the pages', async ({ page }) => {
    const groupId = newGroupId('pages-wait');
    await createPagesGroup(groupId, { author: ADMIN, members: { [ADMIN]: {}, 'سارة': {} } });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByText('بانتظار مسؤول المجموعة لتوزيع الصفحات')).toBeVisible();
  });

  test('the admin starts the khitmah and all 604 pages are split between members', async ({ page }) => {
    const groupId = newGroupId('pages-start');
    await createPagesGroup(groupId, { author: ADMIN, members: { [ADMIN]: {}, 'سارة': {} } });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'بدء الختمة' }).click();

    await expect.poll(() => storedPages(groupId)).toEqual({
      isStarted: true,
      members: {
        [ADMIN]: { done: false, pages: [0, 301] },
        'سارة': { done: false, pages: [302, 603] },
      },
    });
  });

  test('a member sees their pages and marks them as read', async ({ page }) => {
    const groupId = newGroupId('pages-read');
    await createPagesGroup(groupId, {
      author: ADMIN,
      isStarted: true,
      members: { [ADMIN]: { pages: [0, 301] }, 'سارة': { pages: [302, 603] } },
    });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.locator('.page-num')).toHaveText(['303', '604']);
    await page.locator('app-todo label.todo').click();

    await expect.poll(async () => (await storedPages(groupId)).members['سارة'].done).toBe(true);
  });

  test('someone who joins after the distribution is told the pages were already handed out', async ({ page }) => {
    const groupId = newGroupId('pages-late');
    await createPagesGroup(groupId, {
      author: ADMIN,
      isStarted: true,
      members: { [ADMIN]: { pages: [0, 603] }, 'سارة': {} },
    });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByText('وُزّعت صفحات هذه الختمة.', { exact: false })).toBeVisible();
  });

  test('the admin redistributes the pages to include new members', async ({ page }) => {
    const groupId = newGroupId('pages-redistribute');
    await createPagesGroup(groupId, {
      author: ADMIN,
      isStarted: true,
      members: { [ADMIN]: { pages: [0, 603] }, 'سارة': {} },
    });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'توزيع الصفحات من جديد' }).click();

    await expect.poll(async () => (await storedPages(groupId)).members['سارة'].pages).toEqual([302, 603]);
  });

  test('the admin shares the status as a WhatsApp-ready message', async ({ page }) => {
    const groupId = newGroupId('pages-status');
    await createPagesGroup(groupId, {
      title: 'ختمة عن روح الوالد',
      author: ADMIN,
      isStarted: true,
      members: { [ADMIN]: { pages: [0, 301], isTaskDone: true }, 'سارة': { pages: [302, 603] } },
    });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    await expect.poll(async () => (await sharedPayloads(page)).length).toBe(1);
    const [shared] = await sharedPayloads(page);
    expect(shared.title).toBe('وضع الختمة: ختمة عن روح الوالد');
    const lines = shared.text!.split('\n');
    expect(lines[0]).toBe('ختمة عن روح الوالد');
    expect(lines).toContain(`🟢 ${ADMIN}: 1-302`);
    expect(lines).toContain('🔴 سارة: 303-604');
    expect(shared.text).toContain(`رجاء تحديث حالة صفحاتكم عن طريق الرابط: http://localhost:4300/group/${groupId}`);
  });
});
