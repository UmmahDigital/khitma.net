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
  test('nothing is chosen until the admin chooses, and the dialog says what will happen', async ({ page }) => {
    const groupId = newGroupId('repeat-choose');
    await createSequentialGroup(groupId, { author: ADMIN });

    // The test clock: Sunday 1 March 2026, 11:00 in Jerusalem.
    await openAs(page, groupId, ADMIN, true);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    const dialog = page.getByRole('dialog');
    // Two admins who only opened the dialog and saved found their daily khitma moving on every Friday.
    for (const rhythm of ['كل أسبوع، يوم:', 'كل يوم', 'أوّل كل شهر', 'بعد اكتمال كل ختمة', 'بدون تكرار (أبدأ كل ختمة بنفسي)']) {
      await expect(dialog.getByRole('radio', { name: rhythm })).not.toBeChecked();
    }
    await expect(dialog.getByRole('button', { name: 'حفظ' })).toBeDisabled();

    await dialog.getByRole('radio', { name: 'كل يوم' }).click();
    await expect(dialog.locator('.schedule-description')).toHaveText(
      'مع بداية كل يوم تبدأ ختمة جديدة تلقائيًا: ينتقل كل عضو إلى الجزء الذي يلي جزءه، أتمّه أم لم يتمّه. لا حاجة لبدئها بنفسك.'
    );
    await expect(dialog.locator('.schedule-first')).toHaveText('تبدأ أوّل ختمة تلقائية الليلة عند منتصف الليل.');
    await dialog.locator('mat-radio-button', { hasText: 'إتاحة جميع الأجزاء للاختيار' }).click();
    await expect(dialog.locator('.schedule-description')).toContainText('تُتاح جميع الأجزاء للاختيار من جديد');
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect(page.getByText('تمّ الحفظ. تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل، فلا حاجة لبدئها بنفسك.')).toBeVisible();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'day', cycleType: 2 });
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-01T22:00:00Z'));
  });

  test('the admin makes the khitma repeat every Friday, and everyone sees when the next one starts', async ({ page }) => {
    const groupId = newGroupId('repeat-set');
    await createSequentialGroup(groupId, { author: ADMIN });

    // The test clock: Sunday 1 March 2026, 11:00 in Jerusalem.
    await openAs(page, groupId, ADMIN, true);
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'كل أسبوع، يوم:' }).click();
    await expect(dialog.getByRole('button', { name: 'الجمعة' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('radio', { name: 'حجز الجزء التالي لكل عضو', exact: true })).toBeChecked();
    await expect(dialog.locator('.schedule-description')).toContainText('مع بداية يوم الجمعة من كل أسبوع تبدأ ختمة جديدة تلقائيًا');
    await expect(dialog.locator('.schedule-first')).toHaveText('تبدأ أوّل ختمة تلقائية يوم الجمعة 6/3.');
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'week', weekday: 5, cycleType: AUTO_BOOK });
    // Friday 6 March at midnight, Jerusalem time.
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-05T22:00:00Z'));
    await expect(page.locator('.repeat-line')).toHaveText('🔁 تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3');
    expect(await analyticsEvents(page)).toContainEqual(['schedule_set', expect.objectContaining({ every: 'week' })]);
  });

  test('turned on right after the admin started tomorrow’s round by hand, it doesn’t move the khitma on at midnight', async ({ page }) => {
    const groupId = newGroupId('repeat-after-manual');
    // 18:00 in Jerusalem: the admin started tomorrow's round, as every evening.
    await createSequentialGroup(groupId, {
      author: ADMIN, cycle: 7, roundStartedAt: new Date('2026-03-01T16:00:00Z'), roundStartedBy: 'admin',
      assigned: { 1: { owner: ADMIN, status: BOOKED } },
    });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) }, now: new Date('2026-03-01T16:05:00Z') });
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.getByRole('button', { name: 'تكرار الختمة تلقائيًا' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'كل يوم' }).click();
    // Not tonight: the round she just started is tomorrow's.
    await expect(dialog.locator('.schedule-first')).toHaveText('تبدأ أوّل ختمة تلقائية يوم الثلاثاء 3/3.');
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'day', cycleType: AUTO_BOOK });
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-02T22:00:00Z'));
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
    expect((await getDoc(`groups/${groupId}`))!.roundStartedBy).toBe('schedule');
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
    await expect(dialog.locator('.schedule-summary')).toHaveText('لن تبدأ الختمة التالية إلا حين تبدؤها بنفسك.');
    await dialog.getByRole('button', { name: 'حفظ' }).click();

    await expect(page.getByText('تمّ إيقاف التكرار: ابدأ كل ختمة بنفسك.')).toBeVisible();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toBeUndefined();
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toBeUndefined();
    await expect(page.locator('.repeat-line')).toHaveCount(0);
  });
});

test.describe('a round started by hand in a khitma that repeats', () => {
  const daily = { every: 'day', cycleType: AUTO_BOOK };

  test('stands in for the next automatic one, so the khitma moves on once', async ({ browser }) => {
    const groupId = newGroupId('repeat-manual');
    // Tonight's automatic start: midnight in Jerusalem.
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 3, schedule: daily, nextRoundAt: new Date('2026-03-01T22:00:00Z'), assigned: allDone() });

    // 18:00: the admin starts tomorrow's round by hand, as she always did, and sends the table.
    const admin = await browser.newPage();
    await openApp(admin, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) }, now: new Date('2026-03-01T16:00:00Z') });
    await admin.locator('.khitma-done').getByRole('button', { name: 'بدء الختمة التالية' }).click();
    await expect(admin.locator('.repeat-note')).toHaveText(
      'تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل؛ إن بدأتها الآن فستُحسب بدلًا منها، وتبدأ التي بعدها يوم الثلاثاء 3/3.'
    );
    await admin.getByRole('button', { name: 'بدء', exact: true }).click();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(4);
    const group = await getDoc(`groups/${groupId}`);
    expect(group!.nextRoundAt).toEqual(new Date('2026-03-02T22:00:00Z'));
    expect(group!.roundStartedBy).toBe('admin');

    // The next morning a member opens it: her juz is the one in the table, not the one after.
    const member = await browser.newPage();
    await openApp(member, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'عضو 23' }) }, now: new Date('2026-03-02T05:00:00Z') });
    await expect(member.getByRole('button', { name: 'أتممت قراءة جزء 24' })).toBeVisible();
    await member.waitForTimeout(500);
    expect((await getDoc(`groups/${groupId}`))!.cycle).toBe(4);
    await Promise.all([admin.context().close(), member.context().close()]);
  });

  test('the admin is told when the round under way started by itself, before starting another', async ({ page }) => {
    const groupId = newGroupId('repeat-started-auto');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 5,
      schedule: daily,
      nextRoundAt: new Date('2026-03-02T22:00:00Z'),
      roundStartedAt: new Date('2026-03-01T22:24:00Z'),
      roundStartedBy: 'schedule',
      assigned: { 1: { owner: ADMIN, status: BOOKED } },
    });

    // 07:00 the next morning: the admin's habit is to start the day's round now.
    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: ADMIN }) }, now: new Date('2026-03-02T05:00:00Z') });
    await page.getByText('أدوات مسؤول المجموعة').click();
    await page.locator('.admin-tools').getByRole('button', { name: 'بدء الختمة التالية' }).click();
    await expect(page.locator('.started-note')).toHaveText('بدأت هذه الختمة تلقائيًا اليوم الساعة 00:24.');
    await expect(page.locator('.repeat-note')).toContainText('تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل');
    // Going one round back is not a new round: nothing to say about the next automatic start.
    await page.locator('mat-radio-button', { hasText: 'حجز الجزء السابق لكل عضو' }).click();
    await expect(page.locator('.repeat-note')).toHaveCount(0);
    await page.getByRole('button', { name: 'إلغاء' }).click();
    expect((await getDoc(`groups/${groupId}`))!.cycle).toBe(5);
  });
});

test.describe('undoing a round start', () => {
  const daily = { every: 'day', cycleType: AUTO_BOOK };

  async function storedAjza(groupId: string) {
    const group = await getDoc(`groups/${groupId}`);
    return Object.values<any>(group!.ajza)
      .sort((a, b) => a.index - b.index)
      .map((juz) => [juz.owner ?? '', juz.status]);
  }

  test('a round that started by itself is put back exactly as it was; members only see when it started', async ({ browser }) => {
    const groupId = newGroupId('undo-auto');
    await createSequentialGroup(groupId, {
      author: ADMIN,
      cycle: 3,
      schedule: daily,
      nextRoundAt: hoursAgo(1),
      assigned: { 1: { owner: 'سارة', status: DONE }, 2: { owner: 'خالد', status: BOOKED }, 30: { owner: 'ليلى', status: DONE } },
    });
    const before = await storedAjza(groupId);

    // A member opens the khitma: its round was due, so it starts.
    const member = await browser.newPage();
    await openAs(member, groupId, 'خالد');
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(4);
    await expect(member.locator('.round-start-line')).toContainText('بدأت هذه الختمة تلقائيًا');
    await expect(member.locator('.undo-round-btn')).toHaveCount(0);

    // The admin hadn't meant it to: she puts the previous round back in one tap.
    const admin = await browser.newPage();
    await openAs(admin, groupId, ADMIN);
    await admin.locator('.undo-round-btn').click();
    const dialog = admin.getByRole('dialog');
    await expect(dialog).toContainText('الرجوع إلى الختمة السابقة؟');
    await expect(dialog).toContainText('تعود الأسماء وعلامات الإتمام كما كانت قبل بدء هذه الختمة.');
    await dialog.getByRole('button', { name: 'رجوع' }).click();

    await expect(admin.getByText('عادت الختمة السابقة كما كانت.')).toBeVisible();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(3);
    const group = await getDoc(`groups/${groupId}`);
    expect(await storedAjza(groupId)).toEqual(before);
    expect(group!.previousRound).toBeUndefined();
    expect(group!.roundStartedBy).toBeUndefined();
    // The next automatic start is the next one, not again now.
    expect((group!.nextRoundAt as Date).getTime()).toBeGreaterThan(Date.now());
    await expect(member.getByRole('button', { name: 'أتممت قراءة جزء 2' })).toBeVisible();
    expect(await analyticsEvents(admin)).toContainEqual(['round_undone', expect.objectContaining({ trigger: 'schedule' })]);
    await Promise.all([member.context().close(), admin.context().close()]);
  });

  test('a round started by hand shows nothing new on the page', async ({ page }) => {
    const groupId = newGroupId('undo-manual');
    await createSequentialGroup(groupId, { author: ADMIN, cycle: 2, assigned: allDone() });

    await openAs(page, groupId, ADMIN);
    await page.locator('.khitma-done').getByRole('button', { name: 'بدء الختمة التالية' }).click();
    await page.getByRole('button', { name: 'بدء', exact: true }).click();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(3);
    await expect(page.getByRole('button', { name: 'أتممت قراءة جزء 1' })).toHaveCount(0);
    await expect(page.locator('.round-start-line')).toHaveCount(0);
    expect((await getDoc(`groups/${groupId}`))!.previousRound).toBeUndefined();
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

    await expect(page.getByText('تمّ الحفظ. تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3، فلا حاجة لبدئها بنفسك.')).toBeVisible();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))?.schedule).toEqual({ every: 'week', weekday: 5, cycleType: AUTO_BOOK });
    await expect(prompt).toHaveCount(0);
    await expect(page.locator('.repeat-line')).toHaveText('🔁 تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3');
    expect(await analyticsEvents(page)).toContainEqual(['repeat_prompt', expect.objectContaining({ action: 'week' })]);

    // Starting the next round now, by hand, stands in for Friday's: the khitma doesn't move on twice.
    await page.locator('.khitma-done').getByRole('button', { name: 'بدء الختمة التالية' }).click();
    await expect(page.locator('.repeat-note')).toContainText('إن بدأتها الآن فستُحسب بدلًا منها');
    await page.getByRole('button', { name: 'بدء', exact: true }).click();
    await expect.poll(async () => (await getDoc(`groups/${groupId}`))!.cycle).toBe(1);
    expect((await getDoc(`groups/${groupId}`))!.nextRoundAt).toEqual(new Date('2026-03-12T22:00:00Z'));
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
