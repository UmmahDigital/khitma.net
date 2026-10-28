import { expect, test } from '@playwright/test';
import { openApp, readLocalStorage, recordedEvents, recordEventsAcrossReloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSameTaskGroup, createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Members whose phone forgot them (a new phone, iOS clearing site data, another browser) pick their name on the
// join page instead of retyping it exactly.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

test.describe('continuing as an existing member', () => {
  test('a member picks their name and gets their juz back', async ({ page }) => {
    const groupId = newGroupId('continue-seq');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: { 1: { owner: ADMIN, status: DONE }, 5: { owner: 'سارة', status: BOOKED }, 9: { owner: 'خالد', status: BOOKED } },
    });

    await recordEventsAcrossReloads(page);
    await openApp(page, `/group/${groupId}`);
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/join$`));
    const choices = page.locator('.continue-as');
    await expect(choices).toContainText('انضممت من قبل؟');
    await expect(choices.getByRole('button')).toHaveText(['أبو أحمد', 'خالد', 'سارة']);

    await choices.getByRole('button', { name: 'سارة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`), { timeout: 20_000 });
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toBeVisible();
    expect(await readLocalStorage(page, 'groups')).toMatchObject({ [groupId]: { isJoined: true, username: 'سارة' } });
    expect(await recordedEvents(page)).toContainEqual(['member_reclaimed', { group_id: groupId, group_type: 'SEQUENTIAL' }]);
  });

  test('in a same-task group, continuing keeps the member’s done status', async ({ page }) => {
    const groupId = newGroupId('continue-same');
    await createSameTaskGroup(groupId, { author: ADMIN, members: { [ADMIN]: false, 'سارة': true } });

    await openApp(page, `/group/${groupId}`);
    await page.locator('.continue-as').getByRole('button', { name: 'سارة' }).click();
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible({ timeout: 20_000 });

    expect((await getDoc(`groups/${groupId}`))!.members['سارة']).toEqual({ isTaskDone: true });
  });

  test('a group with no names yet only asks for a name', async ({ page }) => {
    const groupId = newGroupId('continue-empty');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openApp(page, `/group/${groupId}`);
    await expect(page.getByLabel('اسمك')).toBeVisible();
    await expect(page.locator('.continue-as')).toHaveCount(0);
  });
});

test.describe('inside Instagram', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.40.92',
  });

  test('the join page suggests opening the link in the browser', async ({ page }) => {
    const groupId = newGroupId('continue-insta');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openApp(page, `/group/${groupId}`);
    await expect(page.locator('.in-app-hint')).toContainText('افتح هذا الرابط في المتصفّح');
  });
});
