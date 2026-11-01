import { expect, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { createSameTaskGroup, newGroupId } from '../support/fixtures';

const ADMIN = 'أبو أحمد';

test('an open dialog sits above the page and dims it', async ({ page }) => {
  const groupId = newGroupId('dialog-overlay');
  await createSameTaskGroup(groupId, { author: ADMIN });

  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
  await page.getByText('أدوات مسؤول المجموعة').click();
  await page.getByRole('button', { name: 'مهمّة جديدة' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Above the page's own z-indexed elements, such as the progress circle (2 and 3).
  await expect(page.locator('.cdk-overlay-container')).toHaveCSS('z-index', '1000');
  await expect(page.locator('.cdk-overlay-backdrop')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.32)');
});
