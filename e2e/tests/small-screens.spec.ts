import { expect, Locator, Page, test } from '@playwright/test';
import { chooseMenuItem, joinedGroups, openApp, OUTSIDE_RAMADAN } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Phones set to large text or a large display size have fewer CSS pixels than the roomy phone the other specs use
// (390x844): 360x595 is such a phone with the browser's bars showing (an admin could not renew her khitma on one:
// the dialog's buttons were below the screen), 320x560 the largest display size, and 740x340 a phone held sideways.
// The first again with the largest text size from the menu (text-size.ts). On each, pages may not scroll sideways,
// and every dialog keeps all its buttons on the screen.

const SCREENS: Array<{ width: number; height: number; textSize?: string }> = [
  { width: 360, height: 595 },
  { width: 320, height: 560 },
  { width: 740, height: 340 },
  { width: 360, height: 595, textSize: 'xl' },
];

const ADMIN = 'أبو أحمد';
const { BOOKED, DONE } = JUZ_STATUS;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000 - 60_000);

/** How far the page, or the app's own scrolling area, reaches past the right or left edge of the screen. */
async function sidewaysOverflow(page: Page): Promise<number> {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const scrollers = [document.documentElement, document.querySelector('#app-content')].filter(Boolean) as Element[];
    return Math.max(...scrollers.map((el) => el.scrollWidth - el.clientWidth));
  });
}

async function expectFitsWidth(page: Page, name: string) {
  expect(await sidewaysOverflow(page), `${name} scrolls sideways`).toBeLessThanOrEqual(1);
}

/** The open dialog, once it has grown in: until then it is scaled down and fits any screen. */
async function openedDialog(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveClass(/\bmdc-dialog--open\b/);
  await expect(dialog).not.toHaveClass(/\bmdc-dialog--opening\b/);
  return dialog;
}

/** Every button at the bottom of the dialog can be seen whole, then the dialog is closed without doing anything. */
async function expectButtonsOnScreen(page: Page, name: string) {
  const dialog = await openedDialog(page);
  const buttons = dialog.locator('.mat-mdc-dialog-actions .mat-mdc-button-base');
  const count = await buttons.count();
  expect(count, `${name} has buttons`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(buttons.nth(i), `${name}: button ${i + 1}`).toBeInViewport({ ratio: 1 });
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function adminTool(page: Page, name: string | RegExp) {
  const tool = page.locator('.admin-tools').getByRole('button', { name, exact: typeof name === 'string' });
  if (!(await tool.isVisible())) {
    await page.getByText('أدوات مسؤول المجموعة').click();
  }
  await tool.click();
}

for (const screen of SCREENS) {
  const viewport = { width: screen.width, height: screen.height };
  // The text size is kept on the phone, like the groups joined.
  const storage = (more: Record<string, unknown> = {}) => (screen.textSize ? { textSize: screen.textSize, ...more } : more);

  test.describe(`a ${screen.width}x${screen.height} screen${screen.textSize ? ` with ${screen.textSize} text` : ''}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
    });

    test('public pages fit its width', async ({ page }) => {
      const groupId = newGroupId('small-public');
      await createSequentialGroup(groupId, { author: ADMIN, assigned: { 1: { owner: ADMIN, status: BOOKED } } });

      await openApp(page, '/', { now: OUTSIDE_RAMADAN, storage: storage() });
      await expect(page.locator('#ayat-count .main-counter')).toBeVisible();
      await expectFitsWidth(page, 'home');

      for (const [path, shown] of [
        ['/new', 'مجموعة ختمة دوريّة'],
        ['/new?type=onetime', 'ختمة جماعيّة لمرّة واحدة'],
        ['/about', 'شرح الاستخدام'],
        [`/group/${groupId}`, 'الانضمام للختمة'],
      ]) {
        await page.goto(path);
        await expect(page.getByText(shown).first()).toBeVisible();
        await expectFitsWidth(page, path);
      }

      await page.goto('/guide/khitma-for-the-deceased/');
      await expect(page.locator('h1')).toBeVisible();
      await expectFitsWidth(page, 'a guide');
    });

    test('a member’s page and dialogs', async ({ page }) => {
      const groupId = newGroupId('small-member');
      await createSequentialGroup(groupId, {
        author: ADMIN,
        assigned: { 1: { owner: ADMIN, status: DONE }, 5: { owner: 'سارة', status: BOOKED } },
      });
      await openApp(page, `/group/${groupId}`, { storage: storage({ groups: joinedGroups({ [groupId]: 'سارة' }) }) });
      await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
      await expectFitsWidth(page, 'the member’s page');

      await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
      await expectButtonsOnScreen(page, 'finishing a juz');

      await chooseMenuItem(page, page.locator('.group-options-menu-button'), 'ترك المجموعة');
      await expectButtonsOnScreen(page, 'leaving the group');

      await page.locator('mat-icon[gaevent="show_notification_clicked"]').click();
      await expectButtonsOnScreen(page, 'the announcement');
    });

    test('the admin’s page and dialogs', async ({ page }) => {
      const groupId = newGroupId('small-admin');
      await createSequentialGroup(groupId, {
        author: ADMIN,
        cycle: 1,
        assigned: {
          1: { owner: ADMIN, status: BOOKED },
          5: { owner: 'سارة', status: BOOKED, updatedAt: daysAgo(9) },
          9: { owner: 'خالد', status: BOOKED },
          12: { owner: 'ليلى', status: DONE },
        },
      });
      await openApp(page, `/group/${groupId}`, { storage: storage({ groups: joinedGroups({ [groupId]: ADMIN }) }) });
      await expect(page.getByText(`السلام عليكم يا ${ADMIN}`)).toBeVisible();
      await page.getByText('أدوات مسؤول المجموعة').click();
      await expect(page.locator('.admin-tools').getByRole('button', { name: 'تعديل تفاصيل الختمة' })).toBeVisible();
      await expectFitsWidth(page, 'the admin’s page');

      for (const tool of ['بدء الختمة التالية', 'تكرار الختمة تلقائيًا', 'تعديل تفاصيل الختمة', /إتاحة الأجزاء المتأخّرة/]) {
        await adminTool(page, tool);
        await expectButtonsOnScreen(page, String(tool));
      }

      await page.locator('app-juz-grid app-juz-toggle').nth(8).click();
      await expectButtonsOnScreen(page, 'a booked juz');
    });
  });
}
