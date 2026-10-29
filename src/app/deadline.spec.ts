import { countdownText, daysUntil, deadlineDate, deadlineText } from './deadline';

describe('deadline', () => {
  const sunday = new Date(2026, 2, 1, 11, 0);

  it('picks the coming Friday, or next week’s on a Friday', () => {
    expect(deadlineDate('friday', null, sunday)).toBe('2026-03-06');
    expect(deadlineDate('friday', null, new Date(2026, 2, 5, 23))).toBe('2026-03-06');
    expect(deadlineDate('friday', null, new Date(2026, 2, 6, 9))).toBe('2026-03-13');
  });

  it('adds days, keeps a picked date, and allows no date', () => {
    expect(deadlineDate('3days', null, sunday)).toBe('2026-03-04');
    expect(deadlineDate('week', null, new Date(2026, 1, 25))).toBe('2026-03-04');
    expect(deadlineDate('date', '2026-04-01', sunday)).toBe('2026-04-01');
    expect(deadlineDate('date', null, sunday)).toBeNull();
    expect(deadlineDate('none', null, sunday)).toBeNull();
  });

  it('writes the date the way the status messages do', () => {
    expect(deadlineText('2026-03-06')).toBe('الجمعة 6/3/2026');
  });

  it('counts down in natural Arabic', () => {
    expect(daysUntil('2026-03-06', sunday)).toBe(5);
    expect(countdownText(5, {}, 'ar')).toBe('بعد 5 أيام');
    expect(countdownText(2, {}, 'ar')).toBe('بعد يومين');
    expect(countdownText(11, {}, 'ar')).toBe('بعد 11 يومًا');
    expect(countdownText(1, {}, 'ar')).toBe('غدًا');
    expect(countdownText(0, {}, 'ar')).toBe('اليوم');
    expect(countdownText(-2, {}, 'ar')).toBe('انتهى الموعد');
    expect(countdownText(5, { deadline: { inDays: 'in {n} days' } }, 'en')).toBe('in 5 days');
  });
});
