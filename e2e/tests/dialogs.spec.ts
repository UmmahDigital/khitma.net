import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { createSameTaskGroup, createSequentialGroup, newGroupId } from '../support/fixtures';

const ADMIN = 'أبو أحمد';

/** The open dialog, once it has grown in: until then it is scaled down and fits any screen. */
async function openedDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveClass(/\bmdc-dialog--open\b/);
  await expect(dialog).not.toHaveClass(/\bmdc-dialog--opening\b/);
  return dialog;
}

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

// A phone set to large text or display size, and a phone held sideways. Material lets a dialog grow past the screen
// unless it has a maxHeight, and these dialogs' buttons ended up below it, out of reach.
const SHORT_SCREENS = [
  { width: 360, height: 520 },
  { width: 740, height: 340 },
];
const ADMIN_DIALOGS = [
  { tool: 'ختمة جديدة للمجموعة', buttons: ['موافق', 'إلغاء'] },
  { tool: 'تكرار الختمة تلقائيًا', buttons: ['حفظ', 'إلغاء'] },
  { tool: 'تعديل تفاصيل الختمة', buttons: ['حفظ التغييرات', 'إلغاء'] },
];

for (const screen of SHORT_SCREENS) {
  for (const { tool, buttons } of ADMIN_DIALOGS) {
    test(`on a ${screen.width}x${screen.height} screen, «${tool}» keeps its buttons on screen`, async ({ page }) => {
      await page.setViewportSize(screen);
      const groupId = newGroupId('dialog-short-screen');
      await createSequentialGroup(groupId, { author: ADMIN, cycle: 1 });

      await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
      await page.getByText('أدوات مسؤول المجموعة').click();
      await page.getByRole('button', { name: tool, exact: true }).click();
      const dialog = await openedDialog(page);

      for (const name of buttons) {
        await expect(dialog.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
      }
    });
  }
}
