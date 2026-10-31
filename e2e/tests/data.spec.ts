import { expect, Page, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Timestamps the app records for the weekly report and for "booked 5 days ago": additive fields only.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

function isRecent(value: unknown): boolean {
  return value instanceof Date && Math.abs(Date.now() - value.getTime()) < 5 * 60_000;
}

async function openDashboard(page: Page, groupId: string, username: string) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }) } });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

test('a new group records when it was created', async ({ page }) => {
  await openApp(page, '/new?type=recurring');
  await page.getByLabel('عنوان الختمة').fill('ختمة الجمعة');
  await page.getByLabel('اسمك (مسؤول الختمة)').fill('أبو محمد');
  await page.getByRole('button', { name: 'إنشاء مجموعة الختمة' }).click();
  await expect(page).toHaveURL(/\/group\/[^/]+\/invite$/);

  const group = await getDoc(`groups/${new URL(page.url()).pathname.split('/')[2]}`);
  expect(isRecent(group!.createdAt)).toBe(true);
});

test('booking a juz records when it changed', async ({ page }) => {
  const groupId = newGroupId('data-book');
  await createSequentialGroup(groupId, { author: ADMIN });

  await openDashboard(page, groupId, 'سارة');
  await page.locator('app-juz-grid app-juz-toggle').nth(4).click();

  await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.ajza['4'].status).toBe(BOOKED);
  const juz = (await getDoc(`groups/${groupId}`))!.ajza['4'];
  expect(juz).toMatchObject({ index: 4, owner: 'سارة', status: BOOKED });
  expect(isRecent(juz.updatedAt)).toBe(true);
});

test('finishing the last juz records the completed round', async ({ page }) => {
  const groupId = newGroupId('data-complete');
  const assigned = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'سارة', status: i === 4 ? BOOKED : DONE }])
  );
  await createSequentialGroup(groupId, { author: ADMIN, assigned, cycle: 2 });

  await openDashboard(page, groupId, 'سارة');
  await page.getByRole('button', { name: 'أتممت قراءة جزء 5' }).click();
  await page.getByRole('button', { name: 'نعم، أتممته' }).click();

  await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.completedRounds).toBeTruthy();
  const group = await getDoc(`groups/${groupId}`);
  expect(Object.keys(group!.completedRounds)).toEqual(['2']);
  expect(isRecent(group!.completedRounds['2'])).toBe(true);
});

test('a juz finished before the last one does not complete the round', async ({ page }) => {
  const groupId = newGroupId('data-not-complete');
  await createSequentialGroup(groupId, {
    author: ADMIN,
    assigned: { 1: { owner: 'سارة', status: BOOKED }, 2: { owner: 'خالد', status: BOOKED } },
  });

  await openDashboard(page, groupId, 'سارة');
  await page.getByRole('button', { name: 'أتممت قراءة جزء 1' }).click();
  await page.getByRole('button', { name: 'نعم، أتممته' }).click();

  await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.ajza['0'].status).toBe(DONE);
  expect((await getDoc(`groups/${groupId}`))!.completedRounds).toBeUndefined();
});

test('a new round records when it started, for every juz', async ({ page }) => {
  const groupId = newGroupId('data-round');
  const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]));
  await createSequentialGroup(groupId, { author: ADMIN, assigned });

  await openDashboard(page, groupId, ADMIN);
  await page.getByText('أدوات مسؤول المجموعة').click();
  await page.locator('.admin-tools').getByRole('button', { name: 'بدء الختمة التالية' }).click();
  await page.getByRole('button', { name: 'بدء', exact: true }).click();

  await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(1);
  const group = await getDoc(`groups/${groupId}`);
  expect(isRecent(group!.roundStartedAt)).toBe(true);
  expect(Object.values<any>(group!.ajza).every((juz) => isRecent(juz.updatedAt))).toBe(true);
  // Everyone automatically got their next juz.
  expect(group!.ajza['1']).toMatchObject({ owner: 'عضو 1', status: BOOKED });
});
