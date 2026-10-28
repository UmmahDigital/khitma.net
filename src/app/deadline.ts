// A khitma's deadline: chosen when it's created, kept as a real date (targetAt, YYYY-MM-DD) for the countdown, and as
// readable Arabic text (targetDate) for the messages that already show it. Groups with a target date finish far more
// often (58% vs 21%), but until now the date could only be typed into the edit dialog.

export type DeadlineChoice = 'none' | '3days' | 'week' | 'friday' | 'date';

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const FRIDAY = 5;

export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The date for a choice, as YYYY-MM-DD; "friday" is the coming Friday (next week's, on a Friday). */
export function deadlineDate(choice: DeadlineChoice, picked: string | null, today = new Date()): string | null {
  switch (choice) {
    case '3days':
      return isoDate(addDays(today, 3));
    case 'week':
      return isoDate(addDays(today, 7));
    case 'friday':
      return isoDate(addDays(today, (FRIDAY - today.getDay() + 7) % 7 || 7));
    case 'date':
      return picked || null;
    default:
      return null;
  }
}

/** "الجمعة 6/3/2026": the format the status messages already use. */
export function deadlineText(targetAt: string): string {
  const date = localDate(targetAt);
  return `${ARABIC_DAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function daysUntil(targetAt: string, today = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((localDate(targetAt).getTime() - start.getTime()) / 86_400_000);
}

/** "بعد 3 أيام"، "غدًا"، "اليوم"، "انتهى الموعد" — or the translation's equivalents. */
export function countdownText(days: number, translation: any, lang: string): string {
  const t = translation?.deadline ?? {};
  if (days < 0) return t.passed || 'انتهى الموعد';
  if (days === 0) return t.today || 'اليوم';
  if (days === 1) return t.tomorrow || 'غدًا';
  if (lang !== 'ar') return (t.inDays || 'in {n} days').replace('{n}', String(days));
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يومًا`;
}

/** The date in the reader's language, e.g. "Friday 6/3" (Arabic uses deadlineText). */
export function localDeadlineText(targetAt: string, lang: string): string {
  if (lang === 'ar') {
    return deadlineText(targetAt);
  }
  return localDate(targetAt).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
}
