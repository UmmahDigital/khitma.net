import { expect, test } from '@playwright/test';
import { openApp, readLocalStorage } from '../support/app';
import { getDoc } from '../support/firestore';

test.describe('personal and global khitmahs', () => {
  test.fail('known bug: the personal khitmah grid does not render', async ({ page }) => {
    const saved = Array.from({ length: 30 }, (_, index) => ({ index, status: index === 0 ? 2 : index === 1 ? 1 : 0 }));
    await openApp(page, '/me/personal-khitma', { storage: { personalKhitma: saved } });
    const toggles = page.locator('app-juz-grid app-juz-toggle .juz-toggle');
    const juz3 = toggles.nth(2);
    const statusOfJuz3 = async () => (await readLocalStorage(page, 'personalKhitma'))[2].status;

    await expect(toggles.nth(0)).toHaveClass(/done/, { timeout: 3_000 });
    await expect(toggles.nth(1)).toHaveClass(/booked/);
    await expect(juz3).toHaveClass(/idle/);
    await juz3.click();
    await expect(juz3).toHaveClass(/booked/);
    expect(await statusOfJuz3()).toBe(1);
    await juz3.click();
    await expect(juz3).toHaveClass(/done/);
    expect(await statusOfJuz3()).toBe(2);
    await juz3.click();
    await expect(juz3).toHaveClass(/idle/);
    expect(await statusOfJuz3()).toBe(0);
  });

  test('the Quran reader opens the first page of the requested juz', async ({ page }) => {
    await openApp(page, '/quran/juz/3');
    await expect(page.locator('iframe')).toHaveAttribute(
      'src',
      'https://app.quranflash.com/book/Medina1?ar#/reader/chapter/44'
    );
  });

  test('Aqsa khitmah: booking pages and finishing them updates the shared counters', async ({ page }) => {
    const before = (await getDoc('global/aqsa'))!.pages;
    await openApp(page, '/aqsa');

    await page.getByRole('button', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: 'أريد تلاوة 5 صحفات' }).click();

    const from = (before.granted % 604) + 1;
    await expect.poll(async () => (await getDoc('global/aqsa'))!.pages.granted).toBe(before.granted + 5);
    expect(await page.evaluate(() => localStorage.getItem('aqsaKhitmaPages'))).toBe(`${from}-${from + 4}`);
    await expect(page.getByText(`${from} - ${from + 4}`)).toBeVisible();

    await page.getByRole('button', { name: 'أتممت تلاوة صفحاتي' }).click();
    await expect.poll(async () => (await getDoc('global/aqsa'))!.pages.completed).toBe(before.completed + 5);
    expect(await page.evaluate(() => localStorage.getItem('aqsaKhitmaPages'))).toBeNull();
  });
});

test.describe('archive', () => {
  test('lists archived groups and can be cleared after confirming', async ({ page }) => {
    await openApp(page, '/me/groups/archive', {
      storage: {
        archivedGroups: {
          'old-group': { id: 'old-group', title: 'ختمة رمضان 2023', joinTimestamp: 1, archivedTimeStamp: 2 },
        },
      },
    });

    await expect(page.getByRole('link', { name: 'ختمة رمضان 2023' })).toHaveAttribute('href', '/group/old-group');
    await page.getByRole('button', { name: 'تنظيف الأرشيف' }).click();
    await page.getByRole('button', { name: 'نعم' }).click();

    await expect(page.getByText('لا توجد لديك مجموعات في الأرشيف')).toBeVisible();
    await expect.poll(() => readLocalStorage(page, 'archivedGroups')).toEqual({});
  });
});
