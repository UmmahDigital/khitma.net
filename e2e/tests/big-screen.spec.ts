import { expect, Locator, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Khitmas read together in one place (a house of condolence, a mosque, a family gathering): people scan a QR code to
// join, and a big screen shows every juz with its reader as it changes.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

/** What a phone camera reads from the QR code, decoded by jsQR from the drawn SVG. */
async function scanQr(page: Page, code: Locator): Promise<string | null> {
  await page.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
  return code.locator('svg').evaluate(async (svg: SVGSVGElement) => {
    const size = 400;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(size));
    clone.setAttribute('height', String(size));
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size);
    return (window as any).jsQR(pixels.data, size, size)?.data ?? null;
  });
}

test.describe('reading together in one place', () => {
  test('the invite page has a QR code that opens the invitation link', async ({ page }) => {
    const groupId = newGroupId('qr-invite');
    await createSequentialGroup(groupId, { author: ADMIN });

    await openApp(page, `/group/${groupId}/invite`, { storage: { refCode: 'qrscan01' } });
    const code = page.locator('.invite-qr app-qr-code');
    await expect(code.locator('svg')).toBeVisible();
    const scanned = await scanQr(page, code);
    expect(scanned).toMatch(new RegExp(`/group/${groupId}\\?r=qrscan01$`));
    await expect(page.getByLabel('رسالة الدعوة للانضمام (يمكنك تعديلها)')).toHaveValue(new RegExp(scanned!.replace(/[?.]/g, '\\$&')));

    await page.getByRole('link', { name: 'عرض على شاشة كبيرة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/screen$`));
  });

  test('the big screen shows every juz with its reader as it changes, and the code to join', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const groupId = newGroupId('big-screen');
    await createSequentialGroup(groupId, { title: 'ختمة العائلة', author: ADMIN, assigned: { 1: { owner: 'خالد', status: DONE }, 2: { owner: 'سارة', status: BOOKED } } });

    await openApp(page, `/group/${groupId}/screen`);
    await expect(page.locator('.screen-header h1')).toHaveText('ختمة العائلة');
    // The whole screen: no toolbar, and not the phone-sized column of wide screens.
    await expect(page.locator('mat-toolbar')).toHaveCount(0);
    expect((await page.locator('.screen').boundingBox())!.width).toBeGreaterThan(1200);

    const cells = page.locator('.juz-cell');
    await expect(cells).toHaveCount(30);
    await expect(cells.nth(0)).toContainText('خالد');
    await expect(cells.nth(1)).toContainText('سارة');
    await expect(page.locator('.count.done')).toContainText('تمّت قراءتها');
    await expect(page.locator('.count.done b')).toHaveText('1');
    await expect(page.locator('.count.reading b')).toHaveText('1');
    await expect(page.locator('.count.free b')).toHaveText('28');
    expect(await scanQr(page, page.locator('.screen-qr'))).toContain(`/group/${groupId}`);
    expect(await analyticsEvents(page)).toContainEqual(['big_screen_opened', expect.objectContaining({ group_id: groupId })]);

    // Someone books a juz on their phone: the screen shows it.
    await createSequentialGroup(groupId, {
      title: 'ختمة العائلة',
      author: ADMIN,
      assigned: { 1: { owner: 'خالد', status: DONE }, 2: { owner: 'سارة', status: BOOKED }, 3: { owner: 'ليلى', status: BOOKED } },
    });
    await expect(cells.nth(2)).toContainText('ليلى');
    await expect(page.locator('.count.reading b')).toHaveText('2');

    // Names on a shared screen are the organiser's choice, and stay hidden on this device.
    await page.getByText('إخفاء الأسماء').click();
    await expect(page.locator('.juz-owner')).toHaveCount(0);
    await page.reload();
    await expect(cells).toHaveCount(30);
    await expect(page.locator('.juz-owner')).toHaveCount(0);
  });

  test('the admin opens the big screen from the admin tools', async ({ page }) => {
    const groupId = newGroupId('big-screen-admin');
    await createSequentialGroup(groupId, { author: ADMIN });
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'عرض على شاشة كبيرة' }).click();
    await expect(page).toHaveURL(new RegExp(`/group/${groupId}/screen$`));
    await expect(page.locator('.juz-cell')).toHaveCount(30);
  });

  test('a completed memorial khitma shows the supplication instead of the code', async ({ page }) => {
    const groupId = newGroupId('big-screen-done');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'خالد', status: DONE }]));
    await createSequentialGroup(groupId, { author: ADMIN, purpose: 'memorial', honoreeGender: 'female', assigned });

    await openApp(page, `/group/${groupId}/screen`);
    await expect(page.locator('.screen-complete')).toHaveText('تمّت الختمة بفضل الله');
    await expect(page.locator('.screen-dua')).toContainText('اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا');
    await expect(page.locator('.screen-qr')).toHaveCount(0);
  });
});
