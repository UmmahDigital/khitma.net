import { expect, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { getDoc, setDoc } from '../support/firestore';
import { ajzaMap, buildAjza, createSequentialGroup, JUZ_STATUS, JuzSpec, newGroupId } from '../support/fixtures';

// A juz changed on a page that still showed an earlier round must not land on the round that replaced it: in daily
// rotation groups, a member who marked yesterday's juz done put her name on another reader's juz, so names appeared
// twice and the other reader lost her place. The app sends the round it showed with each juz change, and the rules
// (firestore.rules) refuse a change for a round that has ended.

const { BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'ليندا';
const PROJECT = 'demo-khitma';
const DOCUMENTS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Everyone has a juz: juz n is «قارئة n»'s, except 23 (مريم) and 24 (فاطمة). */
function rotation(status: number): Record<number, JuzSpec> {
  return Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [i + 1, { owner: i === 22 ? 'مريم' : i === 23 ? 'فاطمة' : `قارئة ${i + 1}`, status }])
  );
}

/** The next round as the app writes it: everyone moves on one juz. */
async function startNextRound(groupId: string, cycle: number) {
  const next = buildAjza(rotation(BOOKED)).map((juz, i, all) => ({ ...all[(i + 29) % 30], index: i }));
  await setDoc(`groups/${groupId}`, { title: 'ختمة', description: '', author: ADMIN, type: 'SEQUENTIAL', cycle, authorId: '', ajza: ajzaMap(next) });
}

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return [juz.owner ?? '', juz.status];
}

async function owners(groupId: string): Promise<string[]> {
  const ajza = (await getDoc(`groups/${groupId}`))!.ajza;
  return Array.from({ length: 30 }, (_, i) => ajza[String(i)].owner ?? '');
}

/** An update sent as the app sends it, through the rules (no admin token). */
async function clientUpdate(groupId: string, fields: Record<string, unknown>, mask: string[]): Promise<number> {
  const query = mask.map((path) => `updateMask.fieldPaths=${encodeURIComponent(path)}`).join('&');
  const response = await fetch(`${DOCUMENTS}/groups/${groupId}?${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return response.status;
}

const juzValue = (index: number, owner: string, status: number) => ({
  mapValue: { fields: { index: { integerValue: String(index) }, owner: { stringValue: owner }, status: { integerValue: String(status) } } },
});
const roundValue = (round: number) => ({ mapValue: { fields: { round: { integerValue: String(round) } } } });

test.describe('a juz changed for a round that has ended', () => {
  test('is refused, instead of landing on another reader’s juz in the new round', async ({ browser }) => {
    const groupId = newGroupId('guard-offline');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 4, assigned: rotation(BOOKED) });

    const context = await browser.newContext();
    const fatima = await context.newPage();
    await openApp(fatima, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'فاطمة' }) } });
    await expect(fatima.getByRole('button', { name: 'أتممت قراءة جزء 24' })).toBeEnabled();

    // Her phone loses its connection; meanwhile the next round starts.
    await context.setOffline(true);
    await startNextRound(groupId, 5);

    // She marks yesterday's juz done: the phone keeps it and sends it when the connection returns.
    await fatima.getByRole('button', { name: 'أتممت قراءة جزء 24' }).click();
    await fatima.getByRole('button', { name: 'نعم، أتممته' }).click();
    await context.setOffline(false);

    await expect(fatima.getByText('بدأت ختمة جديدة، فلم يُسجَّل التغيير على الجزء 24.')).toBeVisible({ timeout: 20_000 });
    await expect(fatima.getByRole('button', { name: 'أتممت قراءة جزء 25' })).toBeVisible();
    expect(await storedJuz(groupId, 24)).toEqual(['مريم', BOOKED]);
    expect((await owners(groupId)).filter((name) => name === 'فاطمة')).toHaveLength(1);
    await context.close();
  });

  test('on a slow connection, yesterday’s juz finished from the phone’s copy isn’t saved over today’s', async ({ browser }) => {
    const groupId = newGroupId('guard-cache');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 4, assigned: rotation(BOOKED) });

    // Yesterday: the phone keeps a copy of the group.
    const context = await browser.newContext();
    const yesterday = await context.newPage();
    await openApp(yesterday, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'فاطمة' }) } });
    await expect(yesterday.getByRole('button', { name: 'أتممت قراءة جزء 24' })).toBeVisible();
    await yesterday.close();

    await startNextRound(groupId, 5);

    // This morning, on a slow connection, the phone's copy shows first, and she finishes yesterday's juz at once.
    const today = await context.newPage();
    await today.route(/localhost:8080/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue().catch(() => {});
    });
    await openApp(today, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'فاطمة' }) } });
    await today.getByRole('button', { name: 'أتممت قراءة جزء 24' }).click();
    await today.getByRole('button', { name: 'نعم، أتممته' }).click();

    await expect(today.getByText('بدأت ختمة جديدة، فلم يُسجَّل التغيير على الجزء 24.')).toBeVisible({ timeout: 20_000 });
    await expect(today.getByRole('button', { name: 'أتممت قراءة جزء 25' })).toBeVisible({ timeout: 20_000 });
    expect(await storedJuz(groupId, 24)).toEqual(['مريم', BOOKED]);
    expect((await owners(groupId)).filter((name) => name === 'فاطمة')).toHaveLength(1);
    await context.close();
  });

  test('the rules: a change for the round under way, or from an older app, goes through; one for an ended round doesn’t', async () => {
    const groupId = newGroupId('guard-rules');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 5, assigned: rotation(BOOKED) });

    expect(await clientUpdate(groupId, { ajza: { mapValue: { fields: { '23': juzValue(23, 'فاطمة', DONE) } } }, lastJuzUpdate: roundValue(4) }, ['ajza.`23`', 'lastJuzUpdate'])).toBe(403);
    expect(await storedJuz(groupId, 24)).toEqual(['فاطمة', BOOKED]);

    expect(await clientUpdate(groupId, { ajza: { mapValue: { fields: { '22': juzValue(22, 'مريم', DONE) } } }, lastJuzUpdate: roundValue(5) }, ['ajza.`22`', 'lastJuzUpdate'])).toBe(200);
    expect(await storedJuz(groupId, 23)).toEqual(['مريم', DONE]);

    // The app as it was before it sent its round.
    expect(await clientUpdate(groupId, { ajza: { mapValue: { fields: { '0': juzValue(0, 'قارئة 1', DONE) } } } }, ['ajza.`0`'])).toBe(200);
    // Other collections are as open as before.
    const refs = await fetch(`${DOCUMENTS}/refs/${newGroupId('guard-ref')}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { joined: { integerValue: '1' } } }),
    });
    expect(refs.status).toBe(200);
  });
});
