import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp, readLocalStorage, sharedPayloads } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

const { IDLE, BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

async function openDashboard(page: Page, groupId: string, username: string, freezeTime = false) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }) }, freezeTime });
  await expect(page).toHaveURL(new RegExp(`/group/${groupId}/dashboard$`));
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

function juzToggle(page: Page, juzNumber: number) {
  return page.locator('app-juz-grid app-juz-toggle').nth(juzNumber - 1);
}

/** Reads a juz from Firestore regardless of the group's storage format (map or legacy array). */
async function storedJuz(groupId: string, juzNumber: number) {
  const ajza = (await getDoc(`groups/${groupId}`))!.ajza;
  const juz = Array.isArray(ajza) ? ajza[juzNumber - 1] : ajza[String(juzNumber - 1)];
  return { owner: juz.owner ?? '', status: juz.status };
}

async function storedOwners(groupId: string) {
  const group = await getDoc(`groups/${groupId}`);
  const ajza = Array.isArray(group!.ajza) ? group!.ajza : Object.values<any>(group!.ajza);
  return {
    cycle: group!.cycle,
    ajza: [...ajza].sort((a, b) => a.index - b.index).map((juz) => [juz.owner ?? '', juz.status]),
  };
}

async function openAdminTools(page: Page) {
  await page.getByText('أدوات مسؤول المجموعة').click();
}

async function startNewKhitmah(page: Page, option?: string) {
  await openAdminTools(page);
  await page.getByRole('button', { name: 'ختمة جديدة للمجموعة' }).click();
  if (option) {
    // Material keeps the real radio input visually hidden; users tap the option itself.
    await page.locator('mat-radio-button', { hasText: option }).click();
    await expect(page.getByRole('radio', { name: option })).toBeChecked();
  }
  await page.getByRole('button', { name: 'موافق' }).click();
}

function expectedAjza(assigned: Record<number, [string, number]>) {
  return Array.from({ length: 30 }, (_, i) => assigned[i + 1] ?? ['', IDLE]);
}

test.describe('sequential group: members', () => {
  test('a member books an available juz', async ({ page }) => {
    const groupId = newGroupId('seq-book');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 1: { owner: ADMIN, status: DONE } } });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByText('يمكنك اختيار أي من الأجزاء التي باللون الأحمر.')).toBeVisible();
    await juzToggle(page, 5).click();

    await expect.poll(() => storedJuz(groupId, 5)).toEqual({ owner: 'سارة', status: BOOKED });
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toBeVisible();
    await expect(page.locator('a.quran-explorer-btn')).toHaveAttribute('href', '/quran/juz/5');
  });

  test("a member cannot take someone else's juz", async ({ page }) => {
    const groupId = newGroupId('seq-taken');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 3: { owner: 'خالد', status: BOOKED } } });

    await openDashboard(page, groupId, 'سارة');
    await juzToggle(page, 3).click();
    await juzToggle(page, 4).click();

    await expect.poll(() => storedJuz(groupId, 4)).toEqual({ owner: 'سارة', status: BOOKED });
    expect(await storedJuz(groupId, 3)).toEqual({ owner: 'خالد', status: BOOKED });
  });

  test('a member marks their juz as finished after confirming', async ({ page }) => {
    const groupId = newGroupId('seq-done');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });

    await openDashboard(page, groupId, 'سارة');
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await expect(page.getByText('تأكيد إتمام الجزء')).toBeVisible();
    await page.getByRole('button', { name: 'لا' }).click();
    expect(await storedJuz(groupId, 5)).toEqual({ owner: 'سارة', status: BOOKED });

    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();

    await expect.poll(() => storedJuz(groupId, 5)).toEqual({ owner: 'سارة', status: DONE });
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toHaveCount(0);
  });

  test('a member gives up their juz', async ({ page }) => {
    const groupId = newGroupId('seq-giveup');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });

    await openDashboard(page, groupId, 'سارة');
    await page.getByRole('button', { name: 'تنازل عن الجزء' }).click();

    await expect.poll(() => storedJuz(groupId, 5)).toEqual({ owner: '', status: IDLE });
  });

  test('the names list shows who has each juz', async ({ page }) => {
    const groupId = newGroupId('seq-names');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 2: { owner: 'خالد', status: BOOKED } } });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.locator('app-juz-list')).toHaveCount(0);
    await page.getByText('إظهار قائمة الأسماء').click();
    await expect(page.locator('app-juz-list app-juz').nth(1)).toContainText('خالد');
  });

  test('leaving archives the group on this phone and returns home', async ({ page }) => {
    const groupId = newGroupId('seq-leave');
    await createSequentialGroup(groupId, { title: 'ختمة للمغادرة', author: ADMIN });

    await openDashboard(page, groupId, 'سارة');
    await page.locator('.group-options-menu-button').click();
    await page.getByRole('menuitem', { name: 'ترك المجموعة' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();

    await expect(page).toHaveURL(/localhost:4300\/$/);
    await expect.poll(() => readLocalStorage(page, 'groups')).toEqual({});
    expect(await readLocalStorage(page, 'archivedGroups')).toMatchObject({ [groupId]: { title: 'ختمة للمغادرة' } });
  });

  test.fail('known bug: leaving keeps the juz you had booked instead of releasing it', async ({ page }) => {
    const groupId = newGroupId('seq-leave-release');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: { 6: { owner: 'سارة', status: BOOKED }, 7: { owner: 'سارة', status: DONE } },
    });

    await openDashboard(page, groupId, 'سارة');
    await page.locator('.group-options-menu-button').click();
    await page.getByRole('menuitem', { name: 'ترك المجموعة' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();
    await expect(page).toHaveURL(/localhost:4300\/$/);

    await expect.poll(() => storedJuz(groupId, 6), { timeout: 3_000 }).toEqual({ owner: '', status: IDLE });
    expect(await storedJuz(groupId, 7)).toEqual({ owner: 'سارة', status: DONE });
  });
});

test.describe('sequential group: admin', () => {
  test('tapping a booked juz marks it done; tapping a done juz clears it after confirming', async ({ page }) => {
    const groupId = newGroupId('seq-admin-tap');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: { 3: { owner: 'خالد', status: BOOKED }, 4: { owner: 'سارة', status: DONE } },
    });

    await openDashboard(page, groupId, ADMIN);
    await juzToggle(page, 3).click();
    await expect.poll(() => storedJuz(groupId, 3)).toEqual({ owner: 'خالد', status: DONE });

    await juzToggle(page, 4).click();
    await page.getByRole('button', { name: 'نعم' }).click();
    await expect.poll(() => storedJuz(groupId, 4)).toEqual({ owner: '', status: IDLE });
  });

  test('new khitmah: everyone automatically gets their next juz', async ({ page }) => {
    const groupId = newGroupId('seq-next');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 1,
      assigned: {
        1: { owner: 'سارة', status: DONE },
        2: { owner: 'خالد', status: BOOKED },
        30: { owner: ADMIN, status: DONE },
      },
    });

    await openDashboard(page, groupId, ADMIN);
    await startNewKhitmah(page);

    await expect.poll(() => storedOwners(groupId)).toEqual({
      cycle: 2,
      ajza: expectedAjza({ 1: [ADMIN, BOOKED], 2: ['سارة', BOOKED], 3: ['خالد', BOOKED] }),
    });
  });

  test('new khitmah: only members who finished get their next juz', async ({ page }) => {
    const groupId = newGroupId('seq-next-done');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 1,
      assigned: {
        1: { owner: 'سارة', status: DONE },
        2: { owner: 'خالد', status: BOOKED },
        30: { owner: ADMIN, status: DONE },
      },
    });

    await openDashboard(page, groupId, ADMIN);
    await startNewKhitmah(page, 'حجز الجزء التالي تلقائيّا فقط للأعضاء الذين أتمّوا جزءهم');

    await expect.poll(() => storedOwners(groupId)).toEqual({
      cycle: 2,
      ajza: expectedAjza({ 1: [ADMIN, BOOKED], 2: ['سارة', BOOKED] }),
    });
  });

  test('new khitmah: all ajza become available', async ({ page }) => {
    const groupId = newGroupId('seq-all-idle');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 3,
      assigned: { 1: { owner: 'سارة', status: DONE }, 2: { owner: 'خالد', status: BOOKED } },
    });

    await openDashboard(page, groupId, ADMIN);
    await startNewKhitmah(page, 'إتاحة جميع الأجزاء للإختيار');

    await expect.poll(() => storedOwners(groupId)).toEqual({ cycle: 4, ajza: expectedAjza({}) });
  });

  test('rewind: everyone goes back one juz, and juz 1 wraps to juz 30', async ({ page }) => {
    const groupId = newGroupId('seq-rewind');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 2,
      assigned: {
        1: { owner: 'سارة', status: BOOKED },
        2: { owner: 'خالد', status: BOOKED },
        3: { owner: ADMIN, status: DONE },
      },
    });

    await openDashboard(page, groupId, ADMIN);
    await startNewKhitmah(page, 'إرجاع الختمة خطوة إلى الوراء (إعطاء كل عضو الجزء السابق له)');

    await expect.poll(() => storedOwners(groupId)).toEqual({
      cycle: 1,
      ajza: expectedAjza({ 30: ['سارة', BOOKED], 1: ['خالد', BOOKED], 2: [ADMIN, BOOKED] }),
    });
  });

  test('rewind is unavailable during the first khitmah', async ({ page }) => {
    const groupId = newGroupId('seq-rewind-first');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 0 });

    await openDashboard(page, groupId, ADMIN);
    await openAdminTools(page);
    await page.getByRole('button', { name: 'ختمة جديدة للمجموعة' }).click();

    await expect(
      page.getByRole('radio', { name: 'إرجاع الختمة خطوة إلى الوراء (إعطاء كل عضو الجزء السابق له)' })
    ).toBeDisabled();
    await page.getByRole('button', { name: 'الغاء' }).click();
    expect((await getDoc(`groups/${groupId}`))!.cycle).toBe(0);
  });

  test('shares the khitmah status as a WhatsApp-ready message', async ({ page }) => {
    const groupId = newGroupId('seq-status');
    await createSequentialGroup(groupId, {
      title: 'ختمة العائلة',
      author: ADMIN,
      targetDate: 'يوم الخميس',
      assigned: { 1: { owner: 'سارة', status: DONE }, 2: { owner: 'خالد', status: BOOKED } },
    });

    await openDashboard(page, groupId, ADMIN, true);
    await openAdminTools(page);
    await page.getByRole('button', { name: 'مشاركة وضع الختمة' }).click();

    const [shared] = await sharedPayloads(page);
    expect(shared.title).toBe('وضع الختمة: ختمة العائلة');
    const lines = shared.text!.split('\n');
    expect(lines[0]).toBe('ختمة العائلة');
    expect(lines[1]).toMatch(/ 1\/3\/2026$/);
    expect(lines).toContain('01 🟢 سارة');
    expect(lines).toContain('02 🟡 خالد');
    expect(lines).toContain('03 🔴 ');
    expect(shared.text).toContain('موعد تسليم الختمة: يوم الخميس.');
    expect(shared.text).toContain(`http://localhost:4300/group/${groupId}`);
  });

  test('edits the group details and adds another admin', async ({ page }) => {
    const groupId = newGroupId('seq-edit');
    await createSequentialGroup(groupId, { title: 'عنوان قديم', author: ADMIN });

    await openDashboard(page, groupId, ADMIN);
    await openAdminTools(page);
    await page.getByRole('button', { name: 'تعديل تفاصيل الختمة' }).click();
    await page.getByLabel('عنوان الختمة').fill('عنوان جديد');
    await page.getByLabel('مسؤولون إضافيّون').fill('سارة');
    await page.getByRole('button', { name: 'حفظ التغييرات' }).click();

    await expect
      .poll(async () => {
        const group = await getDoc(`groups/${groupId}`);
        return { title: group!.title, admins: group!.admins };
      })
      .toEqual({ title: 'عنوان جديد', admins: 'سارة' });
  });

  test('an additional admin sees the admin tools', async ({ page }) => {
    const groupId = newGroupId('seq-coadmin');
    await createSequentialGroup(groupId, { author: ADMIN, admins: 'سارة' });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByText('أدوات مسؤول المجموعة')).toBeVisible();
  });

  test('renames who has a juz from the names list', async ({ page }) => {
    const groupId = newGroupId('seq-rename');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openDashboard(page, groupId, ADMIN);
    const juz7 = page.locator('app-juz-list app-juz').nth(6);
    await juz7.locator('input').fill('ليلى');
    await juz7.getByText('save', { exact: true }).click();

    await expect.poll(() => storedJuz(groupId, 7)).toEqual({ owner: 'ليلى', status: BOOKED });
  });

  test('a completed khitmah celebrates and offers a new khitmah and the dua', async ({ page }) => {
    const groupId = newGroupId('seq-complete');
    const everyoneDone = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }])
    );
    await createSequentialGroup(groupId, { author: ADMIN, assigned: everyoneDone });

    await openDashboard(page, groupId, ADMIN);
    await expect(page.getByRole('button', { name: 'بدء ختمة جديدة للمجموعة' })).toBeVisible();
    await page.getByRole('button', { name: 'مشاركة دعاء الختمة' }).click();

    const [shared] = await sharedPayloads(page);
    expect(shared.text).toContain('اللهم ارحمنى بالقرآن');
  });
});

test.describe('sequential group: older documents still in production', () => {
  test('a legacy group stored as an array still loads and stays an array after updates', async ({ page }) => {
    const groupId = newGroupId('seq-legacy-array');
    await createSequentialGroup(groupId, { format: 'array', author: ADMIN, assigned: { 2: { owner: 'سارة', status: BOOKED } } });

    await openDashboard(page, groupId, 'سارة');
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 2' })).toBeVisible();
    await juzToggle(page, 9).click();

    await expect.poll(() => storedJuz(groupId, 9)).toEqual({ owner: 'سارة', status: BOOKED });
    const group = await getDoc(`groups/${groupId}`);
    expect(Array.isArray(group!.ajza)).toBe(true);
    expect(await storedJuz(groupId, 2)).toEqual({ owner: 'سارة', status: BOOKED });
  });

  test('a group created before group types existed opens as a sequential group', async ({ page }) => {
    const groupId = newGroupId('seq-untyped');
    await createSequentialGroup(groupId, { format: 'untyped', author: ADMIN });

    await openDashboard(page, groupId, 'سارة');
    await juzToggle(page, 12).click();

    await expect.poll(() => storedJuz(groupId, 12)).toEqual({ owner: 'سارة', status: BOOKED });
    expect(Array.isArray((await getDoc(`groups/${groupId}`))!.ajza)).toBe(false);
  });
});
