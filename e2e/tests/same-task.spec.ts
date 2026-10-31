import { expect, Page, test } from '@playwright/test';
import { chooseMenuItem, joinedGroups, openApp, sharedPayloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSameTaskGroup, newGroupId } from '../support/fixtures';

const ADMIN = 'أبو أحمد';

async function openDashboard(page: Page, groupId: string, username: string, freezeTime = false) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }) }, freezeTime });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

async function storedGroup(groupId: string) {
  const group = await getDoc(`groups/${groupId}`);
  return {
    task: group!.task,
    cycle: group!.cycle,
    totalDoneTasks: group!.totalDoneTasks,
    members: Object.fromEntries(Object.entries<any>(group!.members).map(([name, m]) => [name, m.isTaskDone])),
  };
}

test.describe('same-task group', () => {
  test("a member marks today's task as done", async ({ page }) => {
    const groupId = newGroupId('same-done');
    await createSameTaskGroup(groupId, { author: ADMIN, members: { [ADMIN]: false, 'سارة': false }, totalDoneTasks: 3 });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.locator('app-todo')).toContainText('قراءة سورة الكهف');
    await page.locator('app-todo label.todo').click();

    await expect
      .poll(() => storedGroup(groupId))
      .toMatchObject({ totalDoneTasks: 4, members: { [ADMIN]: false, 'سارة': true } });
  });

  test("the admin sets a new task, which resets everyone's status", async ({ page }) => {
    const groupId = newGroupId('same-new-task');
    await createSameTaskGroup(groupId, {
      author: ADMIN,
      cycle: 1,
      task: 'سورة الكهف',
      members: { [ADMIN]: true, 'سارة': true },
    });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مهمّة جديدة' }).click();
    await page.getByLabel('عنوان المهمّة الجديدة').fill('سورة الملك');
    await page.getByRole('button', { name: 'حفظ' }).click();

    await expect
      .poll(() => storedGroup(groupId))
      .toMatchObject({ task: 'سورة الملك', cycle: 2, members: { [ADMIN]: false, 'سارة': false } });
  });

  test("Cancel keeps the current task and everyone's status", async ({ page }) => {
    const groupId = newGroupId('same-new-task-cancel');
    await createSameTaskGroup(groupId, {
      author: ADMIN,
      cycle: 1,
      task: 'سورة الكهف',
      members: { [ADMIN]: true, 'سارة': true },
    });

    await openDashboard(page, groupId, ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مهمّة جديدة' }).click();
    await page.getByLabel('عنوان المهمّة الجديدة').fill('سورة الملك');
    await page.getByRole('button', { name: 'إلغاء' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await page.waitForTimeout(500);
    expect(await storedGroup(groupId)).toMatchObject({
      task: 'سورة الكهف',
      cycle: 1,
      members: { [ADMIN]: true, 'سارة': true },
    });
  });

  test("the admin toggles a member's status by tapping their name", async ({ page }) => {
    const groupId = newGroupId('same-admin-toggle');
    await createSameTaskGroup(groupId, { author: ADMIN, members: { [ADMIN]: false, 'سارة': false } });

    await openDashboard(page, groupId, ADMIN);
    await page.locator('app-group-members mat-card', { hasText: 'سارة' }).click();

    await expect.poll(async () => (await storedGroup(groupId)).members['سارة']).toBe(true);
  });

  test('the admin shares the task status as a WhatsApp-ready message', async ({ page }) => {
    const groupId = newGroupId('same-status');
    await createSameTaskGroup(groupId, {
      title: 'ورد الجمعة',
      author: ADMIN,
      task: 'سورة الكهف',
      members: { [ADMIN]: false, 'سارة': true },
    });

    await openDashboard(page, groupId, ADMIN, true);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    const [shared] = await sharedPayloads(page);
    expect(shared.title).toBe('وضع الختمة: ورد الجمعة');
    const lines = shared.text!.split('\n');
    expect(lines).toContain('المهمّة الحاليّة: سورة الكهف');
    expect(lines).toContain('🟢 سارة');
    expect(lines).toContain(`🔴 ${ADMIN}`);
    expect(shared.text).toContain(`http://localhost:4300/group/${groupId}`);
  });

  test('a member who leaves is removed from the group', async ({ page }) => {
    const groupId = newGroupId('same-leave');
    await createSameTaskGroup(groupId, { author: ADMIN, members: { [ADMIN]: false, 'سارة': false } });

    await openDashboard(page, groupId, 'سارة');
    await chooseMenuItem(page, page.locator('.group-options-menu-button'), 'ترك المجموعة');
    await page.getByRole('button', { name: 'نعم' }).click();

    await expect(page).toHaveURL(/localhost:4300\/$/);
    await expect.poll(async () => Object.keys((await storedGroup(groupId)).members)).toEqual([ADMIN]);
  });
});
