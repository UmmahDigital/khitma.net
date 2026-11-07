import { Juz, JUZ_STATUS } from './entities/entities';
import { intlLocale } from './languages';
import { fill } from './share-messages';

// Khitmas that repeat on a rhythm (every Friday, every day, on the 1st of each month, or after each completion) start
// their next round by themselves: the first member to open the group once it's due starts it, inside a Firestore
// transaction so it happens only once. No server is involved, and admins no longer have to remember.
//
// An admin can still start a round by hand: it stands in for the next automatic one (nextRoundAfterManualStart), so
// the two never both move the khitma on. Daily rotation groups whose admin kept starting tomorrow's round at 18:00
// after turning the repeat on saw it move on again at midnight, and their members' juz taken.

export type RepeatEvery = 'day' | 'week' | 'month' | 'completion';

export interface RoundSchedule {
  every: RepeatEvery;
  /** For weekly rounds: 0 = Sunday … 5 = Friday, 6 = Saturday. */
  weekday?: number;
  /** What a new round does with the ajza (KHITMA_CYCLE_TYPE); usually everyone gets their next juz. */
  cycleType: number;
}

export const FRIDAY = 5;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** After a completion, the next round waits this long, so everyone gets to see the khitma complete. */
export const AFTER_COMPLETION_MS = 6 * HOUR;

/** Half of each rhythm's round. */
const HALF_ROUND_MS: Record<Exclude<RepeatEvery, 'completion'>, number> = { day: 12 * HOUR, week: 3.5 * DAY, month: 15 * DAY };

/** When the next round starts: the first such midnight (local time) after `after`. Null for "after completion". */
export function nextRoundAt(schedule: RoundSchedule, after: Date): Date | null {
  if (schedule.every === 'completion') {
    return null;
  }
  const next = new Date(after.getFullYear(), after.getMonth(), after.getDate());
  if (schedule.every === 'day') {
    next.setDate(next.getDate() + 1);
  } else if (schedule.every === 'week') {
    next.setDate(next.getDate() + (((schedule.weekday ?? FRIDAY) - next.getDay() + 7) % 7 || 7));
  } else {
    next.setMonth(next.getMonth() + 1, 1);
  }
  return next;
}

/**
 * The next automatic start once an admin starts a round by hand: the round they started stands in for the one that
 * was coming (or that was due and hadn't started yet), so the khitma moves on once, and the admin's own rhythm comes
 * first; the repeat only steps in on a day they don't start it.
 */
export function nextRoundAfterManualStart(schedule: RoundSchedule, pending: Date | null, now: Date): Date | null {
  return nextRoundAt(schedule, pending && pending > now ? pending : now);
}

/**
 * The first automatic start once a khitma starts repeating: the next one of its rhythm, unless the khitma under way
 * started less than half a round before it. An admin who started tomorrow's round at 18:00 and then turned on «كل
 * يوم» would otherwise see it move on again at midnight; a khitma created at 23:00 would last an hour. A completed
 * khitma has nothing to protect.
 */
export function firstRoundAt(schedule: RoundSchedule, now: Date, current?: { startedAt?: Date | null; complete?: boolean }): Date | null {
  let next = nextRoundAt(schedule, now);
  const startedAt = current?.startedAt;
  if (!next || !startedAt || current.complete || schedule.every === 'completion') {
    return next;
  }
  while (next.getTime() - startedAt.getTime() < HALF_ROUND_MS[schedule.every]) {
    next = nextRoundAt(schedule, next);
  }
  return next;
}

interface SchedulableGroup {
  schedule?: RoundSchedule | null;
  nextRoundAt?: { toMillis(): number } | null;
  ajza?: Juz[];
  cycle?: number;
  completedRounds?: Record<string, { toMillis(): number } | null>;
}

export function isRoundDue(group: SchedulableGroup, now: number): boolean {
  const schedule = group?.schedule;
  if (!schedule) {
    return false;
  }
  if (schedule.every !== 'completion') {
    const at = group.nextRoundAt?.toMillis?.();
    return typeof at === 'number' && at <= now;
  }
  if (!group.ajza?.length || !group.ajza.every((juz) => juz.status === JUZ_STATUS.DONE)) {
    return false;
  }
  const key = String(group.cycle ?? 0);
  if (!group.completedRounds || !(key in group.completedRounds)) {
    // Completed before completion times were recorded.
    return true;
  }
  // Null while the completion time is still on its way to the server: it was completed just now.
  const at = group.completedRounds[key]?.toMillis?.();
  return typeof at === 'number' && now - at >= AFTER_COMPLETION_MS;
}

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** A schedule in a link («ابدأ ختمة مثلها», start-like.ts): every=week&weekday=5&cycle=1. */
export function scheduleParams(schedule: RoundSchedule): Record<string, string> {
  return {
    every: schedule.every,
    ...(schedule.every === 'week' ? { weekday: String(schedule.weekday ?? FRIDAY) } : {}),
    cycle: String(schedule.cycleType),
  };
}

/** The schedule a link asks for, or null when it asks for none or for something unknown. */
export function scheduleFromParams(params: Record<string, string | undefined>): RoundSchedule | null {
  const every = params['every'] as RepeatEvery;
  const cycleType = Number(params['cycle']);
  if (!['day', 'week', 'month', 'completion'].includes(every) || !Number.isInteger(cycleType) || cycleType < 1 || cycleType > 4) {
    return null;
  }
  if (every !== 'week') {
    return { every, cycleType };
  }
  const weekday = Number(params['weekday'] ?? FRIDAY);
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? { every, weekday, cycleType } : null;
}

/** "كل يوم", "كل أسبوع، يوم: الجمعة", "أوّل كل شهر", "بعد اكتمال كل ختمة". */
export function ruleText(schedule: RoundSchedule, translation: any, lang: string): string {
  const t = translation?.schedule ?? {};
  switch (schedule.every) {
    case 'day':
      return t.day || 'كل يوم';
    case 'month':
      return t.month || 'أوّل كل شهر';
    case 'completion':
      return t.completion || 'بعد اكتمال كل ختمة';
    default:
      return `${t.week || 'كل أسبوع، يوم:'} ${weekdayName(schedule.weekday ?? FRIDAY, lang)}`;
  }
}

/** "الجمعة", "Friday". */
function weekdayName(weekday: number, lang: string): string {
  // 2026-03-01 was a Sunday (weekday 0).
  return lang === 'ar' ? ARABIC_DAYS[weekday] : new Date(2026, 2, 1 + weekday).toLocaleDateString(intlLocale(lang), { weekday: 'long' });
}

/**
 * What turning the repeat on will do, in one sentence: «مع بداية كل يوم تبدأ ختمة جديدة تلقائيًا: ينتقل كل عضو إلى الجزء
 * الذي يلي جزءه، أتمّه أم لم يتمّه. لا حاجة لبدئها بنفسك.» Admins who turned it on kept starting rounds themselves.
 */
export function describeSchedule(schedule: RoundSchedule, translation: any, lang: string): string {
  const t = translation?.schedule ?? {};
  const rules: Record<RepeatEvery, string> = {
    day: t.ruleDay || 'مع بداية كل يوم',
    week: fill(t.ruleWeek || 'مع بداية يوم {weekday} من كل أسبوع', { weekday: weekdayName(schedule.weekday ?? FRIDAY, lang) }),
    month: t.ruleMonth || 'مع بداية أوّل يوم من كل شهر',
    completion: t.ruleCompletion || 'بعد ستّ ساعات من اكتمال كل ختمة',
  };
  const effects: Record<number, string> = {
    1: t.effectAutoBook || 'ينتقل كل عضو إلى الجزء الذي يلي جزءه، أتمّه أم لم يتمّه',
    2: t.effectAllIdle || 'تُتاح جميع الأجزاء للاختيار من جديد',
    3: t.effectDoneOnly || 'ينتقل من أتمّ جزءه إلى الجزء الذي يليه، ويُتاح الباقي للاختيار',
  };
  return fill(t.describe || '{rule} تبدأ ختمة جديدة تلقائيًا: {effect}. لا حاجة لبدئها بنفسك.', {
    rule: rules[schedule.every],
    effect: effects[schedule.cycleType] ?? effects[1],
  });
}

/** "تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3", or "… بعد اكتمال هذه الختمة"; null for khitmas that don't repeat. */
export function repeatText(
  group: SchedulableGroup & { nextRoundAt?: { toDate?(): Date } | null },
  translation: any,
  lang: string,
  now = new Date()
): string | null {
  const schedule = group?.schedule;
  if (!schedule) {
    return null;
  }
  const t = translation?.schedule ?? {};
  if (schedule.every === 'completion') {
    return t.nextAfterCompletion || 'تبدأ الختمة التالية تلقائيًا بعد اكتمال هذه الختمة';
  }
  const at = group.nextRoundAt?.toDate?.();
  if (!at) {
    return null;
  }
  return fill(t.nextAt || 'تبدأ الختمة التالية تلقائيًا {when}', { when: whenText(at, now, translation, lang) });
}

/**
 * After saving: «تمّ الحفظ. تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل، فلا حاجة لبدئها بنفسك.», or that rounds
 * now start only by hand.
 */
export function savedScheduleText(schedule: RoundSchedule | null, first: Date | null, translation: any, lang: string, now = new Date()): string {
  const t = translation?.schedule ?? {};
  if (!schedule) {
    return t.savedOff || 'تمّ إيقاف التكرار: ابدأ كل ختمة بنفسك.';
  }
  if (schedule.every === 'completion' || !first) {
    return t.savedAfterCompletion || 'تمّ الحفظ. تبدأ الختمة التالية تلقائيًا بعد اكتمال هذه الختمة، فلا حاجة لبدئها بنفسك.';
  }
  return fill(t.savedAt || 'تمّ الحفظ. تبدأ الختمة التالية تلقائيًا {when}، فلا حاجة لبدئها بنفسك.', {
    when: whenText(first, now, translation, lang),
  });
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "الجمعة 13/11" (Arabic keeps its digits Western, as the app does everywhere), "Friday, 11/13". */
function dateText(at: Date, lang: string): string {
  return lang === 'ar'
    ? `${ARABIC_DAYS[at.getDay()]} ${at.getDate()}/${at.getMonth() + 1}`
    : at.toLocaleDateString(intlLocale(lang), { weekday: 'long', day: 'numeric', month: 'numeric' });
}

/** "18:00", "6:00 PM". */
function timeText(at: Date, lang: string): string {
  if (lang === 'ar') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  }
  return at.toLocaleTimeString(intlLocale(lang), { hour: 'numeric', minute: '2-digit' });
}

/**
 * When a round starts or started, from where the reader is: «الليلة عند منتصف الليل», «اليوم الساعة 18:00», «غدًا
 * الساعة 05:00», «أمس الساعة 00:24», «يوم الجمعة 13/11» (with its hour when it isn't midnight). Each language's phrase
 * carries its own preposition ("on Friday, 11/13", "tonight at midnight").
 */
export function whenText(at: Date, now: Date, translation: any, lang: string): string {
  const t = translation?.schedule ?? {};
  const days = Math.round((startOfDay(at).getTime() - startOfDay(now).getTime()) / DAY);
  const midnight = at.getHours() === 0 && at.getMinutes() === 0;
  const time = timeText(at, lang);
  if (days === 1 && midnight) {
    return t.tonight || 'الليلة عند منتصف الليل';
  }
  if (days === 0) {
    return fill(t.todayAt || 'اليوم الساعة {time}', { time });
  }
  if (days === 1) {
    return fill(t.tomorrowAt || 'غدًا الساعة {time}', { time });
  }
  if (days === -1) {
    return fill(t.yesterdayAt || 'أمس الساعة {time}', { time });
  }
  const date = dateText(at, lang);
  return midnight ? fill(t.onDate || 'يوم {date}', { date }) : fill(t.onDateAt || 'يوم {date} الساعة {time}', { date, time });
}
