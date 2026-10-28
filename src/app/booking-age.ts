import { Juz, JUZ_STATUS } from './entities/entities';

// How long a juz has been booked, from its updatedAt (recorded since 2026-10; older bookings have no age).

const DAY = 86_400_000;
export const STALE_AFTER_DAYS = 7;

export function bookedForDays(juz: Juz, now = Date.now()): number | null {
  const at = juz?.updatedAt?.toMillis?.();
  return at ? Math.max(0, Math.floor((now - at) / DAY)) : null;
}

/** "حُجز اليوم"، "محجوز منذ يومين"، "محجوز منذ 9 أيام" — or the translation's equivalents. */
export function bookingAgeText(days: number, translation: any, lang: string): string {
  const t = translation?.juz ?? {};
  if (days === 0) return t.bookedToday || 'حُجز اليوم';
  if (lang !== 'ar') return days === 1 ? t.bookedOneDay || 'booked 1 day ago' : (t.bookedDays || 'booked {n} days ago').replace('{n}', String(days));
  if (days === 1) return 'محجوز منذ يوم';
  if (days === 2) return 'محجوز منذ يومين';
  if (days <= 10) return `محجوز منذ ${days} أيام`;
  return `محجوز منذ ${days} يومًا`;
}

/** Booked ajza nobody has marked done for a week or more (only those whose booking time is known). */
export function staleBookings(ajza: Juz[], now = Date.now()): Juz[] {
  return (ajza ?? []).filter((juz) => juz.status === JUZ_STATUS.BOOKED && (bookedForDays(juz, now) ?? -1) >= STALE_AFTER_DAYS);
}
