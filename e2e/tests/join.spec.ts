import { expect, test } from '@playwright/test';
import { openApp, readLocalStorage } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSameTaskGroup, createSequentialGroup, newGroupId } from '../support/fixtures';

test.describe('joining a group from an invite link', () => {
  test('sequential group: the name is saved on this phone and the dashboard opens', async ({ page }) => {
    const groupId = newGroupId('invite-seq');
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: 'أبو أحمد' });

    await openApp(page, `/group/${groupId}`);
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/join$`));
    await expect(page.getByText('ختمة العائلة')).toBeVisible();

    const join = page.getByRole('button', { name: 'الإنضمام للختمة' });
    await expect(join).toBeDisabled();
    await page.getByLabel('اسمك').fill('  سارة  ');
    await join.click();

    // Joining reloads the app once the group is saved; allow for a slow round trip.
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`), { timeout: 20_000 });
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
    await expect(page.getByText('أدوات مسؤول المجموعة')).toHaveCount(0);
    expect(await readLocalStorage(page, 'groups')).toMatchObject({
      [groupId]: { isJoined: true, username: 'سارة' },
    });
  });

  test('same-task group: joining adds the member to the group', async ({ page }) => {
    const groupId = newGroupId('invite-same');
    await createSameTaskGroup(groupId, { members: { 'أبو أحمد': false } });

    await openApp(page, `/group/${groupId}`);
    await page.getByLabel('اسمك').fill('سارة');
    await page.getByRole('button', { name: 'الإنضمام للختمة' }).click();

    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`), { timeout: 20_000 });
    await expect
      .poll(async () => (await getDoc(`groups/${groupId}`))?.members)
      .toMatchObject({ 'أبو أحمد': { isTaskDone: false }, 'سارة': { isTaskDone: false } });
  });

  test('an unknown group link explains and returns home', async ({ page }) => {
    await openApp(page, '/group/this-group-does-not-exist');

    await expect(page.getByText('لم يتم العثور على الختمة المطلوبة.')).toBeVisible();
    await expect(page).toHaveURL(/localhost:4300\/$/);
    await expect(page.getByText('لم يتم العثور على الختمة المطلوبة.')).toHaveCount(1);
  });

  test('a group whose ID contains "join" still opens the join page', async ({ page }) => {
    const groupId = newGroupId('rejoin');
    await createSequentialGroup(groupId, { title: 'ختمة', author: 'أبو أحمد' });

    await openApp(page, `/group/${groupId}`);
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/join$`));
    await expect(page.getByRole('button', { name: 'الإنضمام للختمة' })).toBeVisible();
  });
});
