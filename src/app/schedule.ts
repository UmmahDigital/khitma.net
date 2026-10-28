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
