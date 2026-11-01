import { expect, Page, test } from '@playwright/test';
import { analyticsEvents, joinedGroups, openApp } from '../support/app';
import { getDoc } from '../support/firestore';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Repeating khitmas start their next round by themselves: the first member to open the group once it's due starts
// it, in a transaction, so it happens once however many open it at the same moment.

const { IDLE, BOOKED, DONE } = JUZ_STATUS;
const ADMIN = 'أبو أحمد';
const AUTO_BOOK = 1;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);
const allDone = () => Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: `عضو ${i + 1}`, status: DONE }]));

async function openAs(page: Page, groupId: string, username: string, freezeTime = false) {
  await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: username }) }, freezeTime });
  await expect(page.getByText(`السلام عليكم يا ${username}`)).toBeVisible();
}

async function storedJuz(groupId: string, juzNumber: number) {
  const juz = (await getDoc(`groups/${groupId}`))!.ajza[String(juzNumber - 1)];
  return [juz.owner ?? '', juz.status];
}

test.describe('repeating khitmas', () => {
  test('the admin makes the khitma repeat every Friday, and everyone sees when the next one starts', async ({ page }) => {
    const groupId = newGroupId('repeat-set');
    await createSequentialGroup(groupId, { author: ADMIN });

    // The test clock: Sunday 1 March 2026, 11:00 in Jerusalem.
    await openAs(page, groupId, ADMIN, true);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: 'كل أسبوع، يوم:' })).toBeChecked();
    await expect(dialog.getByRole('button', { name: 'الجمعة' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('radio', { name: 'حجز الجزء التالي لكل عضو', exact: true })).toBeChecked();
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'week', weekday: 5, cycleType: AUTO_BOOK });
    // Friday 6 March at midnight, Jerusalem time.
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-05T22:00:00Z'));
    await expect(page.locator('.repeat-line')).toHaveText('🔁 تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3');
    expect(await analyticsEvents(page)).toContainEqual(['schedule_set', expect.objectContaining({ every: 'week' })]);
  });

  test('the first members to open it after its time start the next round, once', async ({ browser }) => {
    const groupId = newGroupId('repeat-due');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 3,
      schedule: { every: 'week', weekday: 5, cycleType: AUTO_BOOK },
      nextRoundAt: hoursAgo(1),
      assigned: { 1: { owner: 'سارة', status: DONE }, 2: { owner: 'خالد', status: BOOKED } },
    });

    // Two members open the group at the same moment.
    const [sara, khaled] = await Promise.all([browser.newPage(), browser.newPage()]);
    await Promise.all([openAs(sara, groupId, 'سارة'), openAs(khaled, groupId, 'خالد')]);

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(4);
    expect(await storedJuz(groupId, 2)).toEqual(['سارة', BOOKED]);
    expect(await storedJuz(groupId, 3)).toEqual(['خالد', BOOKED]);
    expect(await storedJuz(groupId, 1)).toEqual(['', IDLE]);
    expect(((await getDoc(`groups/${groupId}`))!.nextRoundAt as Date).getTime()).toBeGreaterThan(Date.now());
    await expect(sara.getByRole('button', { name: 'أتممت قراءة جزء 2' })).toBeVisible();

    // Only one of them started it.
    const started = [...(await analyticsEvents(sara)), ...(await analyticsEvents(khaled))].filter(([name]) => name === 'round_started');
    expect(started).toEqual([['round_started', expect.objectContaining({ trigger: 'schedule', every: 'week' })]]);
    await sara.waitForTimeout(500);
    expect((await getDoc(`groups/${groupId}`))!.cycle).toBe(4);
    await Promise.all([sara.context().close(), khaled.context().close()]);
  });

  test('a one-time khitma made to repeat starts its next round without the deadline picked for it', async ({ page }) => {
    const groupId = newGroupId('repeat-deadline');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      purpose: 'memorial',
      assigned: allDone(),
      targetAt: '2026-02-27',
      targetDate: 'الجمعة 27/2/2026',
      schedule: { every: 'week', weekday: 5, cycleType: AUTO_BOOK },
      nextRoundAt: hoursAgo(1),
    });

    await openAs(page, groupId, 'عضو 3');
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(1);
    const group = await getDoc(`groups/${groupId}`);
    expect(group!.targetAt).toBeUndefined();
    expect(group!.targetDate).toBeUndefined();
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 4' })).toBeVisible();
    await expect(page.locator('.repeat-line')).toBeVisible();
    await expect(page.locator('.deadline-line:not(.repeat-line)')).toHaveCount(0);
  });

  test('a khitma that repeats after each completion lets everyone see it complete first', async ({ page }) => {
    const [justDone, doneEarlier] = [newGroupId('repeat-just-done'), newGroupId('repeat-done-earlier')];
    const schedule = { every: 'completion', cycleType: AUTO_BOOK };
    await createSequentialGroup(justDone, { author: ADMIN, assigned: allDone(), schedule, completedRounds: { '0': hoursAgo(1) } });
    await createSequentialGroup(doneEarlier, { author: ADMIN, assigned: allDone(), schedule, completedRounds: { '0': hoursAgo(7) } });

    await openApp(page, `/group/${justDone}`, { storage: { groups: joinedGroups({ [justDone]: 'عضو 3', [doneEarlier]: 'عضو 3' }) } });
    await expect(page.getByRole('button', { name: 'مشاركة دعاء الختمة' })).toBeVisible();
    await expect(page.locator('.repeat-line')).toHaveText('🔁 تبدأ الختمة التالية تلقائيًا بعد اكتمال هذه الختمة');
    await page.waitForTimeout(500);
    expect((await getDoc(`groups/${justDone}`))!.cycle).toBe(0);

    await page.goto(`/group/${doneEarlier}`);
    await expect(page.getByText('السلام عليكم يا عضو 3')).toBeVisible();
    await expect.poll(async () => (await getDoc(`groups/${doneEarlier}`))!.cycle).toBe(1);
    expect(await storedJuz(doneEarlier, 4)).toEqual(['عضو 3', BOOKED]);
  });

  test('the admin can stop the repetition', async ({ page }) => {
    const groupId = newGroupId('repeat-stop');
    await createSequentialGroup(groupId, {
      author: ADMIN, schedule: { every: 'day', cycleType: AUTO_BOOK }, nextRoundAt: new Date(Date.now() + 3_600_000),
    });

    await openAs(page, groupId, ADMIN);
    await expect(page.locator('.repeat-line')).toBeVisible();
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: 'كل يوم' })).toBeChecked();
    await dialog.getByRole('radio', { name: 'بدون تكرار (أبدأ كل ختمة بنفسي)' }).click();
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toBeUndefined();
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toBeUndefined();
    await expect(page.locator('.repeat-line')).toHaveCount(0);
  });
});

test.describe('asking whether a one-time khitma repeats', () => {
  test('when a one-time khitma completes, its admin can make it repeat every Friday', async ({ page }) => {
    const groupId = newGroupId('repeat-ask');
    await createSequentialGroup(groupId, { author: ADMIN, purpose: 'memorial', honoreeGender: 'male', assigned: allDone() });

    // The test clock: Sunday 1 March 2026, 11:00 in Jerusalem.
    await openAs(page, groupId, ADMIN, true);
    const prompt = page.locator('.repeat-prompt');
    await expect(prompt).toContainText('هل تكرّرون الختمة؟');
    await prompt.getByRole('button', { name: 'كل جمعة' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'week', weekday: 5, cycleType: AUTO_BOOK });
    await expect(prompt).toHaveCount(0);
    await expect(page.locator('.repeat-line')).toHaveText('🔁 تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3');
    expect(await analyticsEvents(page)).toContainEqual(['repeat_prompt', expect.objectContaining({ action: 'week' })]);
  });

  test('«لا، شكرًا» is remembered', async ({ page }) => {
    const groupId = newGroupId('repeat-no');
    await createSequentialGroup(groupId, { author: ADMIN, purpose: 'healing', assigned: allDone() });

    await openAs(page, groupId, ADMIN);
    await page.locator('.repeat-prompt').getByRole('button', { name: 'لا، شكرًا' }).click();
    await expect(page.locator('.repeat-prompt')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'بدء الختمة التالية' }).first()).toBeVisible();
    await expect(page.locator('.repeat-prompt')).toHaveCount(0);
    expect((await getDoc(`groups/${groupId}`))!.schedule).toBeUndefined();
  });

  test('is not asked of members, of recurring khitmas, or of khitmas that already repeat', async ({ page }) => {
    const oneTime = newGroupId('repeat-member');
    const recurring = newGroupId('repeat-recurring');
    const repeating = newGroupId('repeat-already');
    await createSequentialGroup(oneTime, { author: ADMIN, purpose: 'memorial', assigned: allDone() });
    await createSequentialGroup(recurring, { author: ADMIN, purpose: 'regular', assigned: allDone() });
    await createSequentialGroup(repeating, { author: ADMIN, purpose: 'memorial', assigned: allDone(), schedule: { every: 'month', cycleType: AUTO_BOOK } });

    await openApp(page, '/', { storage: { groups: joinedGroups({ [oneTime]: 'خالد', [recurring]: ADMIN, [repeating]: ADMIN }) } });
    for (const groupId of [oneTime, recurring, repeating]) {
      await page.goto(`/group/${groupId}`);
      await expect(page.locator('.khitma-done')).toBeVisible();
      await expect(page.locator('.repeat-prompt')).toHaveCount(0);
    }
  });
});
