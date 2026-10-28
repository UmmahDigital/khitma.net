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

  test('recommends Dayma in the reader\'s language, in a new tab', async ({ page, browser }) => {
    await openApp(page, '/');
    const arabic = page.getByRole('link', { name: 'تعرّف على دايمة' });
    await expect(arabic).toHaveAttribute('href', 'https://dayma.hasanat.dev/?lang=ar');
    await expect(arabic).toHaveAttribute('target', '_blank');
    await expect(page.getByText('أوراد')).toHaveCount(0);

    const english = await (await browser.newContext()).newPage();
    await openApp(english, '/', { storage: { lng: 'en' } });
    await expect(english.getByRole('link', { name: 'Discover Dayma' })).toHaveAttribute('href', 'https://dayma.hasanat.dev/en/');
  });

  test('the big buttons keep their labels in the middle', async ({ page }) => {
    await openApp(page, '/');
    await expect(page.locator('#ayat-count .main-counter')).toHaveText(/\d/);

    const offsets = await page.locator('a.large').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        const label = button.querySelector('.mdc-button__label')!.getBoundingClientRect();
        return Math.abs(label.top + label.height / 2 - (box.top + box.height / 2));
      })
    );
    expect(offsets.length).toBeGreaterThanOrEqual(4);
    for (const offset of offsets) expect(offset).toBeLessThanOrEqual(1.5);
  });

  test('on wide screens, the toolbar ends where the page content starts', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page, '/');

    const toolbarBottom = await page.locator('mat-toolbar').evaluate((el) => el.getBoundingClientRect().bottom);
    const contentTop = await page.locator('#app-content').evaluate((el) => el.getBoundingClientRect().top);
    expect(toolbarBottom).toBe(contentTop);
  });
});
