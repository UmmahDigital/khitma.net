import { bookedForDays, bookingAgeText, staleBookings } from './booking-age';
import { JUZ_STATUS } from './entities/entities';

describe('booking age', () => {
  const now = Date.UTC(2026, 2, 10, 12);
  const at = (daysAgo: number) => ({ toMillis: () => now - daysAgo * 86_400_000 });

  it('counts whole days, and knows when it doesn’t know', () => {
    expect(bookedForDays({ index: 0, status: JUZ_STATUS.BOOKED, owner: 'سارة', updatedAt: at(9) }, now)).toBe(9);
    expect(bookedForDays({ index: 0, status: JUZ_STATUS.BOOKED, owner: 'سارة' }, now)).toBeNull();
  });

  it('says it in natural Arabic', () => {
    expect(bookingAgeText(0, {}, 'ar')).toBe('حُجز اليوم');
    expect(bookingAgeText(1, {}, 'ar')).toBe('محجوز منذ يوم');
    expect(bookingAgeText(2, {}, 'ar')).toBe('محجوز منذ يومين');
    expect(bookingAgeText(9, {}, 'ar')).toBe('محجوز منذ 9 أيام');
    expect(bookingAgeText(14, {}, 'ar')).toBe('محجوز منذ 14 يومًا');
    expect(bookingAgeText(9, { juz: { bookedDays: 'booked {n} days ago' } }, 'en')).toBe('booked 9 days ago');
    expect(bookingAgeText(1, { juz: { bookedOneDay: 'booked 1 day ago' } }, 'en')).toBe('booked 1 day ago');
  });

  it('finds bookings a week old or more, ignoring unknown ages and other statuses', () => {
    const ajza = [
      { index: 0, status: JUZ_STATUS.BOOKED, owner: 'a', updatedAt: at(7) },
      { index: 1, status: JUZ_STATUS.BOOKED, owner: 'b', updatedAt: at(6) },
      { index: 2, status: JUZ_STATUS.BOOKED, owner: 'c' },
      { index: 3, status: JUZ_STATUS.DONE, owner: 'd', updatedAt: at(30) },
    ];
    expect(staleBookings(ajza, now).map((juz) => juz.index)).toEqual([0]);
  });
});
