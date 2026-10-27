import { expect, test } from '@playwright/test';
import { openApp, readLocalStorage } from '../support/app';
import { getDoc } from '../support/firestore';
import { buildAjza, createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Data shapes written by previous versions of the app, as found on users' phones.
function legacyPhoneStorage(groupIds: { current: string; legacyArray: string }) {
  const personalKhitma = buildAjza({ 1: { owner: '', status: JUZ_STATUS.DONE }, 2: { owner: '', status: JUZ_STATUS.BOOKED } }).map(
    ({ index, status }) => ({ index, status })
  );
  return {
    groups: {
      [groupIds.current]: { isJoined: true, username: 'سارة', joinTimestamp: 1_600_000_000_000 },
      [groupIds.legacyArray]: { isJoined: true, username: 'سارة ', joinTimestamp: 1_600_000_100_000 },
    },
    archivedGroups: {
      'archived-2021': { id: 'archived-2021', title: 'ختمة 2021', joinTimestamp: 1_500_000_000_000, archivedTimeStamp: 1_600_000_000_000 },
    },
    personalKhitma,
    myGlobalKhitmaAjza: Array.from({ length: 30 }, (_, i) => i < 3),
    lng: 'ar',
    aqsaKhitmaPages: '101-110',
    lastRecievedNotificationId: '2',
  };
}

test.describe('phones with data from older versions', () => {
  test('everything saved by older versions still shows up', async ({ page }) => {
    const current = newGroupId('legacy-current');
    const legacyArray = newGroupId('legacy-array');
    await createSequentialGroup(current, { title: 'ختمة الحيّ', assigned: { 4: { owner: 'سارة', status: JUZ_STATUS.BOOKED } } });
    await createSequentialGroup(legacyArray, { title: 'ختمة قديمة جدا', format: 'array' });

    await openApp(page, '/', { storage: legacyPhoneStorage({ current, legacyArray }) });
    await expect(page.getByRole('link', { name: 'ختمة الحيّ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ختمة قديمة جدا' })).toBeVisible();
    await expect(page.locator('.mat-badge-content')).toBeHidden();

    await page.getByRole('link', { name: 'أرشيف الختمات' }).click();
    await expect(page.getByRole('link', { name: 'ختمة 2021' })).toBeVisible();

    await page.goto('/aqsa');
    await expect(page.getByText('101 - 110')).toBeVisible();

    await page.goto(`/group/${current}`);
    await expect(page).toHaveURL(new RegExp(`/group/${current}/dashboard$`));
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 4' })).toBeVisible();
    expect(await readLocalStorage(page, 'groups')).toMatchObject({ [current]: { username: 'سارة' } });
  });

  test('old login data prefills the creator name, and the email is not stored in the group', async ({ page }) => {
    await openApp(page, '/new?type=recurring', {
      storage: { login: { id: 'legacy-user', email: 'sara@example.com', fullName: 'سارة', groupIds: [] } },
    });

    await expect(page.getByLabel('اسمك (مسؤول الختمة)')).toHaveValue('سارة');
    await page.getByLabel('عنوان الختمة').fill('ختمة جديدة');
    await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();

    await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);
    const groupId = new URL(page.url()).pathname.split('/')[2];
    expect(await getDoc(`groups/${groupId}`)).toMatchObject({ author: 'سارة', authorId: '' });
  });

  test('old social-login data does not hide the groups list on the home page', async ({ page }) => {
    const groupId = newGroupId('legacy-login');
    await createSequentialGroup(groupId, { title: 'ختمة المسجد' });

    await openApp(page, '/', {
      storage: {
        groups: { [groupId]: { isJoined: true, username: 'سارة', joinTimestamp: 1_600_000_000_000 } },
        login: { id: 'legacy-user', email: 'sara@example.com', fullName: 'سارة', groupIds: [groupId] },
      },
    });

    await expect(page.getByRole('link', { name: 'ختمة المسجد', exact: true })).toBeVisible();
    await expect(page.locator('app-group-list-item')).toHaveCount(1);
  });
});
