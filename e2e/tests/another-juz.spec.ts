import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Right after finishing a juz, the member is offered the next free one: most khitmas that stall still have
// ajza nobody took, and someone who just finished is the likeliest to read one more.

const { IDLE, BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';

async function finishJuz(page: Page, groupId: string, juzNumber: number) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
  await page.getByRole('button', { name: `أتممت قراءة جزء ${juzNumber}` }).click();
  await page.getByRole('button', { name: 'نعم' }).click();
}

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return { owner: juz.owner ?? '', status: juz.status };
}

test.describe('reading another juz', () => {
  test('after finishing a juz, the next free one is offered and booked in one tap', async ({ page }) => {
    const groupId = newGroupId('next-juz');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });

    await finishJuz(page, groupId, 5);
    const offer = page.locator('.next-juz-offer');
    await expect(offer).toContainText('جزاكم الله خيرًا');
    await expect(offer).toContainText('بقي 29 جزءًا بلا قارئ');
    await expect(offer).toContainText('هل تقرأ الجزء 6 أيضًا؟');
    await offer.getByRole('button', { name: 'اقرأ الجزء 6' }).click();

    await expect.poll(() => storedJuz(groupId, 6)).toEqual({ owner: 'سارة', status: BOOKED });
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 6' })).toBeVisible();
    await expect(offer).toHaveCount(0);
    expect((await analyticsEvents(page)).filter(([name]) => name === 'next_juz_offer').map(([, p]) => (p as any).action)).toEqual([
      'shown',
      'accepted',
    ]);
  });

  test('the offer skips taken ajza and wraps from 30 to 1', async ({ page }) => {
    const groupId = newGroupId('next-juz-wrap');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      assigned: {
        30: { owner: 'سارة', status: BOOKED },
        1: { owner: 'خالد', status: DONE },
        2: { owner: 'ليلى', status: BOOKED },
        3: { owner: 'خالد', status: BOOKED },
      },
    });

    await finishJuz(page, groupId, 30);
    await expect(page.locator('.next-juz-offer')).toContainText('هل تقرأ الجزء 4 أيضًا؟');
  });

  test('nothing is offered when no juz is free', async ({ page }) => {
    const groupId = newGroupId('next-juz-none');
    const assigned = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: 'خالد', status: BOOKED }]));
    assigned[5] = { owner: 'سارة', status: BOOKED };
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await finishJuz(page, groupId, 5);
    await expect.poll(() => storedJuz(groupId, 5)).toEqual({ owner: 'سارة', status: DONE });
    await expect(page.locator('.next-juz-offer')).toHaveCount(0);
  });

  test('"later" closes the offer without booking anything', async ({ page }) => {
    const groupId = newGroupId('next-juz-later');
    await createSequentialGroup(groupId, { author: ADMIN, assigned: { 5: { owner: 'سارة', status: BOOKED } } });

    await finishJuz(page, groupId, 5);
    await page.locator('.next-juz-offer').getByRole('button', { name: 'لاحقًا' }).click();

    await expect(page.locator('.next-juz-offer')).toHaveCount(0);
    expect(await storedJuz(groupId, 6)).toEqual({ owner: '', status: IDLE });
  });

  test('close to the end, the card says so', async ({ page }) => {
    const groupId = newGroupId('next-juz-few');
    const assigned = Object.fromEntries(Array.from({ length: 27 }, (_, i) => [i + 1, { owner: 'خالد', status: DONE }]));
    await createSequentialGroup(groupId, { author: ADMIN, assigned });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect(page.locator('.help-finish')).toContainText('اقتربت الختمة: بقي 3 أجزاء بلا قارئ');
  });
});
