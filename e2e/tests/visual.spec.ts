import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { setDoc } from '../support/firestore';
import { createPagesGroup, createSameTaskGroup, createSequentialGroup, JUZ_STATUS } from '../support/fixtures';

// Visual reference of the current design. Fixed IDs, data and clock keep the screenshots deterministic.
// Regenerate deliberately with `npm run e2e:update-screenshots` and review the image diffs.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const PHONE = { width: 390, height: 844 };
const TALL_PHONE = { width: 390, height: 1900 };

const FAMILY_AJZA = {
  1: { owner: 'سارة', status: DONE },
  2: { owner: 'خالد', status: DONE },
  3: { owner: 'ليلى', status: BOOKED },
  4: { owner: ADMIN, status: BOOKED },
  5: { owner: 'سارة', status: BOOKED },
  6: { owner: 'محمود', status: DONE },
};

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.fonts.check('24px "Material Icons"') && document.fonts.check('16px "Markazi Text"'))
    )
    .toBe(true);
}

async function snap(page: Page, name: string) {
  await settle(page);
  // Embedded third-party pages (YouTube) are blocked in tests and masked here.
  await expect(page).toHaveScreenshot(`${name}.png`, { mask: [page.locator('iframe')] });
}

async function openAsMember(page: Page, groupId: string, username: string) {
  await openApp(page, `/group/${groupId}`, {
    storage: { groups: joinedGroups({ [groupId]: username }), lastRecievedNotificationId: '2' },
    freezeTime: true,
  });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

test.describe('screenshots of the current design', () => {
  // Baselines are recorded on macOS (darwin); CI runs the behavior tests only.
  test.skip(!!process.env.CI, 'Screenshot baselines are recorded locally on macOS.');

  test.beforeAll(async () => {
    await setDoc('global/aqsa', { pages: { completed: 1250, granted: 1400 } });
    await createSequentialGroup('visual-family', {
      title: 'ختمة العائلة',
      author: ADMIN,
      cycle: 2,
      description: 'نهديها لروح جدّنا رحمه الله',
      targetDate: 'يوم الجمعة',
      assigned: FAMILY_AJZA,
    });
    await createSequentialGroup('visual-complete', {
      title: 'ختمة مكتملة',
      author: ADMIN,
      assigned: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }])),
    });
    await createSameTaskGroup('visual-daily', {
      title: 'ورد الجمعة',
      author: ADMIN,
      cycle: 3,
      task: 'سورة الكهف',
      members: { [ADMIN]: true, 'سارة': false, 'خالد': true },
      totalDoneTasks: 12,
    });
    await createPagesGroup('visual-pages-waiting', { title: 'ختمة عن روح الوالد', author: ADMIN, members: { [ADMIN]: {}, 'سارة': {} } });
    await createPagesGroup('visual-pages', {
      title: 'ختمة عن روح الوالد',
      author: ADMIN,
      isStarted: true,
      members: { [ADMIN]: { pages: [0, 301], isTaskDone: true }, 'سارة': { pages: [302, 603] } },
    });
  });

  test('home: new visitor', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openApp(page, '/', { freezeTime: true });
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-new-visitor');
  });

  test('home: returning member with groups', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openApp(page, '/', {
      storage: {
        groups: joinedGroups({ 'visual-family': 'سارة', 'visual-daily': 'سارة' }),
        archivedGroups: { 'visual-old': { id: 'visual-old', title: 'ختمة قديمة', joinTimestamp: 1, archivedTimeStamp: 2 } },
        lastRecievedNotificationId: '2',
      },
      freezeTime: true,
    });
    await expect(page.getByRole('link', { name: 'ورد الجمعة' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ختمة العائلة' })).toBeVisible();
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-with-groups');
  });

  test('home: desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page, '/', { freezeTime: true });
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-desktop');
  });

  test('home: English', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', { storage: { lng: 'en' }, freezeTime: true });
    await expect(page.getByRole('link', { name: 'Create a periodical set' })).toBeVisible();
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-english');
  });

  for (const [name, path] of [
    ['create-recurring', '/new?type=recurring'],
    ['create-onetime', '/new?type=onetime'],
  ] as const) {
    test(`create group: ${name}`, async ({ page }) => {
      await page.setViewportSize(TALL_PHONE);
      await openApp(page, path, { freezeTime: true });
      await expect(page.getByLabel('عنوان الختمة')).toBeVisible();
      await snap(page, name);
    });
  }

  test('invite page after creating a group', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/group/visual-family/invite', { freezeTime: true });
    await expect(page.getByLabel('رسالة الدعوة للإنضمام (يمكنك تعديلها)')).toHaveValue(/visual-family/);
    await snap(page, 'group-invite');
  });

  test('join page', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/group/visual-family', { freezeTime: true });
    await expect(page.getByRole('button', { name: 'الإنضمام للختمة' })).toBeVisible();
    await snap(page, 'group-join');
  });

  test('sequential group: member with a booked juz', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-family', 'سارة');
    await page.getByText('إظهار قائمة الأسماء').click();
    await expect(page.locator('app-juz-list app-juz')).toHaveCount(30);
    await snap(page, 'sequential-member');
  });

  test('sequential group: admin tools', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-family', ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await expect(page.getByRole('button', { name: 'ختمة جديدة للمجموعة' })).toBeVisible();
    await snap(page, 'sequential-admin');
  });

  test('sequential group: new khitmah dialog', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-family', ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    const newKhitmah = page.getByRole('button', { name: 'ختمة جديدة للمجموعة' });
    await expect(newKhitmah).toBeVisible();
    await newKhitmah.click();
    await expect(page.getByRole('button', { name: 'موافق' })).toBeVisible();
    // The dialog focuses the first option; drop focus so the focus halo doesn't flicker between runs.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settle(page);
    // Only the dialog: opening it also collapses the admin panel behind the backdrop, mid-animation.
    await expect(page.locator('mat-dialog-container')).toHaveScreenshot('sequential-new-khitmah-dialog.png');
  });

  test('sequential group: completed khitmah', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-complete', ADMIN);
    await expect(page.getByRole('button', { name: 'بدء ختمة جديدة للمجموعة' })).toBeVisible();
    await snap(page, 'sequential-complete');
  });

  test('same-task group: member', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-daily', 'سارة');
    await expect(page.locator('app-group-members mat-card')).toHaveCount(3);
    await snap(page, 'same-task-member');
  });

  test('same-task group: admin', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-daily', ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await expect(page.getByRole('button', { name: 'مهمّة جديدة' })).toBeVisible();
    await snap(page, 'same-task-admin');
  });

  test('page distribution group: waiting for the admin', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-pages-waiting', 'سارة');
    await expect(page.getByText('بانتظار مسؤول المجموعة لتوزيع الصفحات')).toBeVisible();
    await snap(page, 'pages-waiting');
  });

  test('page distribution group: member with pages', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-pages', 'سارة');
    await expect(page.locator('.page-num')).toHaveText(['303', '604']);
    await snap(page, 'pages-member');
  });

  test('personal khitmah', async ({ page }) => {
    await page.setViewportSize(PHONE);
    const saved = Array.from({ length: 30 }, (_, index) => ({ index, status: index < 4 ? DONE : index < 6 ? BOOKED : 0 }));
    await openApp(page, '/me/personal-khitma', {
      storage: { personalKhitma: saved, lastRecievedNotificationId: '2' },
      freezeTime: true,
    });
    await expect(page.locator('app-juz-grid app-juz-toggle .juz-toggle.done')).toHaveCount(4);
    await snap(page, 'personal-khitmah');
  });

  test('archive', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/me/groups/archive', {
      storage: {
        archivedGroups: {
          'visual-old': { id: 'visual-old', title: 'ختمة رمضان 2023', joinTimestamp: 1, archivedTimeStamp: 2 },
          'visual-older': { id: 'visual-older', title: 'ختمة عن روح الجدّة', joinTimestamp: 3, archivedTimeStamp: 4 },
        },
        lastRecievedNotificationId: '2',
      },
      freezeTime: true,
    });
    await expect(page.getByRole('link', { name: 'ختمة رمضان 2023' })).toBeVisible();
    await snap(page, 'archive');
  });

  test('about', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openApp(page, '/about', { storage: { lastRecievedNotificationId: '2' }, freezeTime: true });
    await expect(page.locator('app-about')).toBeVisible();
    await snap(page, 'about');
  });

  test('Aqsa khitmah', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openApp(page, '/aqsa', { storage: { lastRecievedNotificationId: '2' }, freezeTime: true });
    await expect(page.getByRole('button', { name: 'أريد تلاوة 10 صحفات' })).toBeVisible();
    await expect(page.locator('app-aqsa-khitma .main-counter').first()).toHaveText(/1,?250/);
    await snap(page, 'aqsa');
  });
});
