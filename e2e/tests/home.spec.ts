import { expect, test } from '@playwright/test';
import { joinedGroups, openApp, readLocalStorage } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

test.describe('home', () => {
  test('shows the main actions without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await openApp(page, '/');

    await expect(page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'بدء ختمة جماعيّة لمرّة واحدة' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ختمة المسجد الأقصى العالميّة' })).toBeVisible();
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);
    expect(errors).toEqual([]);
  });

  test('lists the groups saved on this phone and opens them', async ({ page }) => {
    const familyId = newGroupId('home-family');
    const friendsId = newGroupId('home-friends');
    await createSequentialGroup(familyId, { title: 'ختمة العائلة', assigned: { 1: { owner: 'سارة', status: JUZ_STATUS.DONE } } });
    await createSequentialGroup(friendsId, { title: 'ختمة الأصدقاء' });

    await openApp(page, '/', { storage: { groups: joinedGroups({ [familyId]: 'سارة', [friendsId]: 'سارة' }) } });

    await expect(page.getByText('مجموعاتي الحاليّة')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ختمة الأصدقاء' })).toBeVisible();
    await page.getByRole('link', { name: 'ختمة العائلة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${familyId}/dashboard$`));
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
  });

  test('archives a group after confirmation and lists it in the archive', async ({ page }) => {
    const groupId = newGroupId('home-archive');
    await createSequentialGroup(groupId, { title: 'ختمة رمضان الماضي' });

    await openApp(page, '/', { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect(page.getByRole('link', { name: 'ختمة رمضان الماضي' })).toBeVisible();

    await page.getByText('settings', { exact: true }).click();
    await page.getByText('archive', { exact: true }).click();
    await page.getByRole('button', { name: 'نعم' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'ختمة رمضان الماضي' })).toHaveCount(0);
    await expect.poll(() => readLocalStorage(page, 'groups')).toEqual({});
    expect(Object.keys(await readLocalStorage(page, 'archivedGroups'))).toEqual([groupId]);

    await page.getByRole('link', { name: 'أرشيف الختمات' }).click();
    await expect(page).toHaveURL(/\/me\/groups\/archive$/);
    await expect(page.getByText('ختمة رمضان الماضي')).toBeVisible();
  });

  test('switches to English and remembers the choice', async ({ page }) => {
    await openApp(page, '/', { storage: { lng: 'en' } });

    await expect(page.getByRole('link', { name: 'Create a periodical set' })).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/ltr/);
  });
});
