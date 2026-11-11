import { expect, test } from '@playwright/test';
import { joinedGroups, openApp, readLocalStorage } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, JuzSpec, newGroupId } from '../support/fixtures';

// The same person's name is often written two ways (ة or ه, a mark copied from WhatsApp): after an admin re-typed a
// daily rotation's names, two members no longer found their juz. A member's juz is still the one under her exact
// name; when a booked juz has it written differently and she has none, she is asked whether it's hers.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'ليندا';

/** Everyone has a juz: juz n is «قارئة n»'s, except those given. */
function everyone(except: Record<number, JuzSpec> = {}): Record<number, JuzSpec> {
  const assigned: Record<number, JuzSpec> = {};
  for (let n = 1; n <= 30; n++) {
    assigned[n] = { owner: n === 1 ? ADMIN : `قارئة ${n}`, status: BOOKED };
  }
  return { ...assigned, ...except };
}

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return [juz.owner ?? '', juz.status];
}

test.describe('a name written differently in the khitma', () => {
  test('a member whose name the admin wrote with ه instead of ة takes her juz back in one tap', async ({ page }) => {
    const groupId = newGroupId('names-ta');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: everyone({ 24: { owner: 'فاطمه', status: BOOKED } }) });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'فاطمة' }) } });
    const prompt = page.locator('.not-my-name');
    await expect(prompt).toContainText('هل اسمك مكتوب في الختمة هكذا؟');
    // Not another juz to read instead: «اقرأ الجزء …» was taken for her «أتممت قراءة جزء …» button.
    await expect(page.locator('.all-booked')).toHaveCount(0);
    await prompt.getByRole('button', { name: 'فاطمه' }).click();

    await expect(page.getByText('السلام عليكم يا فاطمه')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 24' })).toBeVisible();
    expect(await readLocalStorage(page, 'groups')).toMatchObject({ [groupId]: { isJoined: true, username: 'فاطمه' } });
    // Nothing was written: her juz and everyone else's stay as they were.
    expect(await storedJuz(groupId, 24)).toEqual(['فاطمه', BOOKED]);
  });

  test('nobody else is asked: not a member with her own juz, nor one whose name isn’t in the khitma', async ({ browser }) => {
    const groupId = newGroupId('names-not-asked');
    // Two people whose names share their letters: each keeps her own juz.
    await createSequentialGroup(groupId, { author: ADMIN, assigned: everyone({ 7: { owner: 'فاطمة', status: BOOKED }, 24: { owner: 'فاطمه', status: BOOKED } }) });

    const fatima = await browser.newPage();
    await openApp(fatima, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'فاطمة' }) } });
    await expect(fatima.getByRole('button', { name: 'أتممت قراءة جزء 7' })).toBeVisible();
    await expect(fatima.getByRole('button', { name: /أتممت قراءة جزء/ })).toHaveCount(1);
    await expect(fatima.locator('.not-my-name')).toHaveCount(0);

    const newcomer = await browser.newPage();
    await openApp(newcomer, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سلمى' }) } });
    await expect(newcomer.getByText('جميع الأجزاء محجوزة')).toBeVisible();
    await expect(newcomer.locator('.not-my-name')).toHaveCount(0);
    await Promise.all([fatima.context().close(), newcomer.context().close()]);
  });
});

test.describe('the admin’s names list', () => {
  test('keeps what the admin is typing while another member finishes her juz', async ({ browser }) => {
    const groupId = newGroupId('names-typing');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 1, assigned: everyone() });

    const admin = await browser.newPage();
    await openApp(admin, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) } });
    const juz5 = admin.locator('app-juz-list app-juz').nth(4).locator('input');
    await juz5.fill('سعاد');

    const member = await browser.newPage();
    await openApp(member, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'قارئة 10' }) } });
    await member.getByRole('button', { name: 'أتممت قراءة جزء 10' }).click();
    await member.getByRole('button', { name: 'نعم، أتممته' }).click();
    await expect.poll(() => storedJuz(groupId, 10)).toEqual(['قارئة 10', DONE]);
    await admin.waitForTimeout(300);

    await expect(juz5).toHaveValue('سعاد');
    await admin.locator('app-juz-list app-juz').nth(4).getByText('save', { exact: true }).click();
    await expect.poll(() => storedJuz(groupId, 5)).toEqual(['سعاد', BOOKED]);
    await Promise.all([admin.context().close(), member.context().close()]);
  });
});
