import { expect, Page, test } from '@playwright/test';
import { joinedGroups, OLD_ANDROID_UA, openApp, openInTooOldBrowser, OUTSIDE_RAMADAN, sharedImage } from '../support/app';
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
      page.evaluate(() => document.fonts.check('24px "Material Icons Outlined"') && document.fonts.check('16px "Markazi Text"'))
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
    await setDoc('refs/visualref', { joined: 7, read: 12, started: 1 });
    await createSequentialGroup('visual-ramadan', { title: 'ختمة رمضان', author: ADMIN, purpose: 'ramadan', assigned: FAMILY_AJZA });
    await createSequentialGroup('visual-card', { title: 'ختمة عن روح جدّنا رحمه الله', author: ADMIN, assigned: FAMILY_AJZA });
    await createSequentialGroup('visual-memorial-done', {
      title: 'ختمة عن روح فاطمة رحمها الله',
      author: ADMIN,
      purpose: 'memorial',
      honoreeGender: 'female',
      assigned: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }])),
    });
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
    // Booking times relative to the frozen clock (2026-03-01 09:00 UTC): 9 days, 2 days and a few hours ago.
    await createSequentialGroup('visual-stale', {
      title: 'ختمة العائلة',
      author: ADMIN,
      assigned: {
        1: { owner: 'خالد', status: DONE, updatedAt: new Date('2026-02-25T10:00:00Z') },
        2: { owner: 'سارة', status: BOOKED, updatedAt: new Date('2026-02-20T08:00:00Z') },
        3: { owner: 'ليلى', status: BOOKED, updatedAt: new Date('2026-02-27T08:00:00Z') },
        4: { owner: 'محمود', status: BOOKED, updatedAt: new Date('2026-03-01T06:00:00Z') },
      },
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
    await openApp(page, '/', { now: OUTSIDE_RAMADAN });
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-new-visitor');
  });

  test('home: a member whose invitations brought people', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', {
      storage: {
        groups: joinedGroups({ 'visual-family': 'سارة' }),
        refCode: 'visualref',
        refShared: '1',
        lastRecievedNotificationId: '2',
      },
      now: OUTSIDE_RAMADAN,
    });
    const card = page.locator('.impact-card');
    await expect(card).toContainText('انضمّ عبر دعواتك 7 أشخاص');
    // The counter below the card loads separately; wait for it, or the screenshot depends on timing.
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await snap(page, 'home-invitation-impact');
  });

  test('home: during Ramadan', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', { storage: { lastRecievedNotificationId: '2' }, freezeTime: true });
    await expect(page.locator('.ramadan-card')).toBeVisible();
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-ramadan');
  });

  test('home: returning member with groups', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openApp(page, '/', {
      storage: {
        groups: joinedGroups({ 'visual-family': 'سارة', 'visual-daily': 'سارة' }),
        archivedGroups: { 'visual-old': { id: 'visual-old', title: 'ختمة قديمة', joinTimestamp: 1, archivedTimeStamp: 2 } },
        lastRecievedNotificationId: '2',
      },
      now: OUTSIDE_RAMADAN,
    });
    await expect(page.getByRole('link', { name: 'ورد الجمعة' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ختمة العائلة' })).toBeVisible();
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-with-groups');
  });

  test('home: desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page, '/', { now: OUTSIDE_RAMADAN });
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await snap(page, 'home-desktop');
  });

  test('home: English', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', { storage: { lng: 'en' }, now: OUTSIDE_RAMADAN });
    await expect(page.getByRole('link', { name: 'Create a recurring khitma group' })).toBeVisible();
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

  test('create group: a memorial khitma', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/new?type=onetime', { freezeTime: true });
    await page.getByRole('button', { name: 'عن روح متوفّى' }).click();
    await page.getByLabel('اسم المتوفّى').fill('فاطمة');
    await page.getByRole('button', { name: 'رحمها الله' }).click();
    await expect(page.getByLabel('عنوان الختمة')).toHaveValue('ختمة عن روح فاطمة رحمها الله');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.getByRole('heading', { name: 'ما الغرض من الختمة؟' }).evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
    await snap(page, 'create-memorial');
  });

  test('invite page after creating a group', async ({ page }) => {
    await page.setViewportSize(PHONE);
    // A fixed sharer's code: the invite link shows it (?r=visualref).
    await openApp(page, '/group/visual-family/invite', { storage: { refCode: 'visualref' }, freezeTime: true });
    await expect(page.getByLabel('رسالة الدعوة للانضمام (يمكنك تعديلها)')).toHaveValue(/visual-family/);
    await snap(page, 'group-invite');
  });

  test('join page', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/group/visual-family', { freezeTime: true });
    await expect(page.getByRole('button', { name: 'الانضمام للختمة' })).toBeVisible();
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

  test('sequential group: admin sees how long ajza have been booked', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-stale', ADMIN);
    await expect(page.locator('app-juz-list app-juz').nth(1)).toContainText('محجوز منذ 9 أيام');
    await page.locator('app-juz-list app-juz').first().evaluate((row) => row.scrollIntoView({ block: 'start' }));
    await snap(page, 'sequential-admin-booking-ages');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByText('أدوات مسؤول المجموعة').click();
    await expect(page.getByRole('button', { name: 'إتاحة المحجوز منذ أسبوع أو أكثر (1)' })).toBeVisible();
    await snap(page, 'sequential-admin-stale-tools');
  });

  test('sequential group: admin taps a booked juz', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-stale', ADMIN);
    await page.locator('app-juz-grid app-juz-toggle').nth(1).click();
    await expect(page.getByRole('button', { name: 'تمّت قراءته' })).toBeVisible();
    // The dialog focuses its first button; drop focus so the focus halo doesn't flicker between runs.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settle(page);
    await expect(page.locator('mat-dialog-container')).toHaveScreenshot('sequential-admin-juz-actions.png');
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

  test('sequential group: repeating the khitma automatically', async ({ page }) => {
    await page.setViewportSize(TALL_PHONE);
    await openAsMember(page, 'visual-family', ADMIN);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    await expect(page.getByRole('button', { name: 'حفظ' })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await settle(page);
    await expect(page.locator('mat-dialog-container')).toHaveScreenshot('sequential-schedule-dialog.png');
  });

  test('sequential group: completed khitmah', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-complete', ADMIN);
    await expect(page.getByRole('button', { name: 'بدء ختمة جديدة للمجموعة' })).toBeVisible();
    await snap(page, 'sequential-complete');
  });

  test('sequential group: completed memorial khitma', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-memorial-done', 'عضو 3');
    await expect(page.locator('.memorial-dua-text')).toBeVisible();
    await page.locator('.memorial-dua').evaluate((card) => card.scrollIntoView({ block: 'center' }));
    await snap(page, 'sequential-memorial-complete');
  });

  test('WhatsApp Status image: a juz just finished', async ({ page }) => {
    await openAsMember(page, 'visual-card', 'سارة');
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();
    await settle(page);
    await page.locator('.next-juz-offer').getByRole('button', { name: 'شارك في حالة واتساب' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__sharedFiles.length)).toBe(1);
    expect((await sharedImage(page)).bytes).toMatchSnapshot('status-card-juz.png');
  });

  test('WhatsApp Status image: a completed khitma', async ({ page }) => {
    await openAsMember(page, 'visual-complete', ADMIN);
    await settle(page);
    await page.locator('.khitma-done').getByRole('button', { name: 'شارك في حالة واتساب' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__sharedFiles.length)).toBe(1);
    expect((await sharedImage(page)).bytes).toMatchSnapshot('status-card-complete.png');
  });

  test('sequential group: after Ramadan, the admin is asked about a weekly khitma', async ({ page }) => {
    await page.setViewportSize(PHONE);
    // The 20th of Ramadan 1447.
    await openApp(page, '/group/visual-ramadan', {
      storage: { groups: joinedGroups({ 'visual-ramadan': ADMIN }), lastRecievedNotificationId: '2' },
      now: new Date('2026-03-09T09:00:00Z'),
    });
    await expect(page.locator('.after-ramadan')).toBeVisible();
    await page.locator('.after-ramadan').evaluate((card) => card.scrollIntoView({ block: 'center' }));
    await snap(page, 'sequential-after-ramadan');
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
    await expect(page.getByRole('button', { name: 'أريد تلاوة 10 صفحات' })).toBeVisible();
    await expect(page.locator('app-aqsa-khitma .main-counter').first()).toHaveText(/1,?250/);
    await snap(page, 'aqsa');
  });

  test('popup: main menu', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', { storage: { lastRecievedNotificationId: '2' }, now: OUTSIDE_RAMADAN });
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    await page.getByRole('button', { name: 'menu' }).click();
    await expect(page.getByRole('link', { name: 'عن البرنامج' })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await snap(page, 'popup-main-menu');
  });

  test('popup: group menu', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-family', 'سارة');
    await page.locator('.group-options-menu-button').click();
    await expect(page.getByRole('menuitem', { name: 'ترك المجموعة' })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await snap(page, 'popup-group-menu');
  });

  test('popup: announcement', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openApp(page, '/', { now: OUTSIDE_RAMADAN });
    await expect(page.locator('.mat-badge-content')).toBeVisible();
    await page.locator('mat-icon[gaevent="show_notification_clicked"]').click();
    await expect(page.getByRole('link', { name: 'مجموعة الفيسبوك' })).toBeVisible();
    await settle(page);
    await expect(page.locator('mat-dialog-container')).toHaveScreenshot('popup-announcement.png');
  });

  test('popup: confirm finishing a juz', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openAsMember(page, 'visual-family', 'سارة');
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await expect(page.getByRole('button', { name: 'نعم' })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await snap(page, 'popup-confirm-juz');
  });
});

test.describe('screenshot of the update screen', () => {
  test.skip(!!process.env.CI, 'Screenshot baselines are recorded locally on macOS.');
  test.use({ userAgent: OLD_ANDROID_UA });

  test('phone too old for the app (Android)', async ({ page }) => {
    await openInTooOldBrowser(page);
    await expect(page.locator('#unsupported-browser h1')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => document.fonts.load('700 32px "Markazi Text"'));
    await expect.poll(() => page.evaluate(() => document.fonts.check('22px "Markazi Text"'))).toBe(true);
    await expect.poll(() => page.locator('#unsupported-browser img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page).toHaveScreenshot('unsupported-browser-android.png');
  });
});
