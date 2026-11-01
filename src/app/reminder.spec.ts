import { googleCalendarUrl, icsFile, Reminder, reminderStart } from './reminder';

describe('reminder', () => {
  const reminder: Reminder = {
    title: '📖 قراءة الجزء 7 – ختمة العائلة، رحمهم الله',
    details: 'بعد قراءته، سجّل إتمامه في صفحة الختمة:\nhttps://khitma.net/group/abc',
    start: new Date(Date.UTC(2026, 2, 1, 17, 0)),
  };

  describe('reminderStart', () => {
    it('is 8pm the same day when that is more than an hour away', () => {
      const start = reminderStart(new Date(2026, 2, 1, 9, 30));
      expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([1, 20, 0]);
    });

    it('is 8pm the next day when 8pm is less than an hour away or past', () => {
      for (const now of [new Date(2026, 2, 1, 19, 15), new Date(2026, 2, 1, 23, 0)]) {
        const start = reminderStart(now);
        expect([start.getDate(), start.getHours()]).toEqual([2, 20]);
      }
    });
  });

  it('fills in Google Calendar\'s new event form', () => {
    const url = new URL(googleCalendarUrl(reminder));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe(reminder.title);
    expect(url.searchParams.get('details')).toBe(reminder.details);
    expect(url.searchParams.get('dates')).toBe('20260301T170000Z/20260301T173000Z');
  });

  describe('icsFile', () => {
    const ics = icsFile(reminder, new Date(Date.UTC(2026, 2, 1, 9, 0)), 'juz-7@khitma.net');
    const unfolded = ics.replace(/\r\n /g, '');

    it('has one event, at the reminder time, with an alert', () => {
      expect(unfolded).toContain('DTSTART:20260301T170000Z\r\nDTEND:20260301T173000Z');
      expect(unfolded).toContain('BEGIN:VALARM\r\nACTION:DISPLAY');
      expect(unfolded).toContain('TRIGGER:PT0M');
    });

    it('escapes commas, semicolons and line breaks in the text (the Arabic comma needs none)', () => {
      const english = icsFile({ ...reminder, title: 'Read juz 7, then; rest' }, new Date(Date.UTC(2026, 2, 1, 9, 0)), 'x');
      expect(english.replace(/\r\n /g, '')).toContain('SUMMARY:Read juz 7\\, then\\; rest');
      expect(unfolded).toContain('DESCRIPTION:بعد قراءته، سجّل إتمامه في صفحة الختمة:\\nhttps://khitma.net/group/abc');
    });

    it('keeps lines within 75 bytes without splitting a character', () => {
      const encoder = new TextEncoder();
      for (const line of ics.split('\r\n')) {
        expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
        expect(line).not.toContain('\uFFFD');
      }
      expect(unfolded).toContain(`SUMMARY:${reminder.title}`);
    });
  });
});
