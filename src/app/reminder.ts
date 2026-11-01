// «ذكّرني»: a calendar event reminding a member to read the juz they booked. Most people book a juz in a WhatsApp
// group and mean to read it later; a reminder in their own calendar brings them back to it.

export interface Reminder {
  title: string;
  details: string;
  start: Date;
}

const DURATION_MINUTES = 30;
const EVENING_HOUR = 20;

/** The next 8pm, at least an hour away (otherwise 8pm the next day). People can change it before saving. */
export function reminderStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(EVENING_HOUR, 0, 0, 0);
  if (start.getTime() - now.getTime() < 60 * 60 * 1000) {
    start.setDate(start.getDate() + 1);
  }
  return start;
}

/** 20260301T170000Z */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function end(reminder: Reminder): Date {
  return new Date(reminder.start.getTime() + DURATION_MINUTES * 60 * 1000);
}

/** Opens Google Calendar's "new event" form, filled in (the app on Android when installed, the site otherwise). */
export function googleCalendarUrl(reminder: Reminder): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: reminder.title,
    details: reminder.details,
    dates: `${utcStamp(reminder.start)}/${utcStamp(end(reminder))}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545), without splitting a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** An .ics file with one event and an alert at its time, for the phone's own calendar. */
export function icsFile(reminder: Reminder, now: Date, uid: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Khitma.net//Reminder//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(reminder.start)}`,
    `DTEND:${utcStamp(end(reminder))}`,
    `SUMMARY:${escapeText(reminder.title)}`,
    `DESCRIPTION:${escapeText(reminder.details)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(reminder.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
