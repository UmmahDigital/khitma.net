import { Juz, JUZ_STATUS } from './entities/entities';

// Khitmas that repeat on a rhythm (every Friday, every day, on the 1st of each month, or after each completion) start
// their next round by themselves: the first member to open the group once it's due starts it, inside a Firestore
// transaction so it happens only once. No server is involved, and admins no longer have to remember.

export type RepeatEvery = 'day' | 'week' | 'month' | 'completion';

export interface RoundSchedule {
  every: RepeatEvery;
  /** For weekly rounds: 0 = Sunday … 5 = Friday, 6 = Saturday. */
  weekday?: number;
  /** What a new round does with the ajza (KHITMA_CYCLE_TYPE); usually everyone gets their next juz. */
  cycleType: number;
}

export const FRIDAY = 5;

/** After a completion, the next round waits this long, so everyone gets to see the khitma complete. */
export const AFTER_COMPLETION_MS = 6 * 3_600_000;

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
    default: {
      const weekday = schedule.weekday ?? FRIDAY;
      // 2026-03-01 was a Sunday (weekday 0).
      const day = lang === 'ar' ? ARABIC_DAYS[weekday] : new Date(2026, 2, 1 + weekday).toLocaleDateString(lang, { weekday: 'long' });
      return `${t.week || 'كل أسبوع، يوم:'} ${day}`;
    }
  }
}

/** "تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3", or "… بعد اكتمال هذه الختمة"; null for khitmas that don't repeat. */
export function repeatText(group: SchedulableGroup & { nextRoundAt?: { toDate?(): Date } | null }, translation: any, lang: string): string | null {
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
  const when =
    lang === 'ar'
      ? `يوم ${ARABIC_DAYS[at.getDay()]} ${at.getDate()}/${at.getMonth() + 1}`
      : at.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'numeric' });
  return (t.nextAt || 'تبدأ الختمة التالية تلقائيًا {when}').replace('{when}', when);
}
