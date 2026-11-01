import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Groups are kept on the phone (src/app/firestore.ts): they open again without the server, and changes made
// offline are sent when the connection returns. Starting the next round reads the server, so it waits for one.

const ADMIN = 'أبو أحمد';
const { BOOKED, DONE } = JUZ_STATUS;

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return { owner: juz.owner ?? '', status: juz.status };
}

async function openAsSara(page: Page, groupId: string) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
  await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toBeVisible();
}

test.describe('without a connection', () => {
  test('a group opened before opens again from the phone when the server can’t be reached', async ({ page }) => {
    const groupId = newGroupId('offline-cache');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });
    await openAsSara(page, groupId);

    // The app's own files still load; Firestore (the emulator) can't be reached.
    await page.route(/localhost:8080/, (route) => route.abort());
    await page.reload();
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toBeVisible();
  });

  test('a juz finished offline is kept, and sent when the connection returns', async ({ page, context }) => {
    const groupId = newGroupId('offline-write');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });
    await openAsSara(page, groupId);

    await context.setOffline(true);
    await expect(page.locator('.offline-bar')).toContainText('لا يوجد اتصال بالإنترنت');
    await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
    await page.getByRole('button', { name: 'نعم، أتممته' }).click();
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 5' })).toHaveCount(0);
    expect(await storedJuz(groupId, 5)).toEqual({ owner: 'سارة', status: BOOKED });

    await context.setOffline(false);
    await expect(page.locator('.offline-bar')).toHaveCount(0);
    await expect.poll(() => storedJuz(groupId, 5), { timeout: 20_000 }).toEqual({ owner: 'سارة', status: DONE });
  });

  test('the next round needs a connection: the admin is told, and nothing changes', async ({ page, context }) => {
    const groupId = newGroupId('offline-round');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 1, assigned: { 1: { owner: ADMIN, status: DONE } } });
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    await expect(page.getByText(`السلام عليكم يا ${ADMIN}`)).toBeVisible();

    await context.setOffline(true);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'بدء الختمة التالية' }).click();
    await page.getByRole('button', { name: 'بدء', exact: true }).click();
    await expect(page.getByText('تعذّر بدء الختمة التالية')).toBeVisible();

    await context.setOffline(false);
    expect((await getDoc(`groups/${groupId}`))!.cycle).toBe(1);
  });
});
