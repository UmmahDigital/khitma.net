// Ramadan is when most group khitmas are made. Dates come from the Umm al-Qura calendar built into the browser
// (Intl); the real start can differ by a day with the moon sighting, which doesn't matter for these suggestions.
// Browsers without that calendar get none of them.

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

const SHABAN = 8;
const RAMADAN = 9;
const SHAWWAL = 10;
const DAY = 86_400_000;

let formatter: Intl.DateTimeFormat | null | undefined;

function hijriFormatter(): Intl.DateTimeFormat | null {
  if (formatter === undefined) {
    try {
      const candidate = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
      formatter = candidate.resolvedOptions().calendar === 'islamic-umalqura' ? candidate : null;
    } catch {
      formatter = null;
    }
  }
  return formatter;
}

export function hijri(date: Date): HijriDate | null {
  const format = hijriFormatter();
  if (!format) {
    return null;
  }
  const parts = Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: parseInt(parts.year, 10), month: parseInt(parts.month, 10), day: parseInt(parts.day, 10) };
}

/** From the middle of Sha'ban to the end of Ramadan: the home page offers Ramadan khitmas. */
export function isRamadanSeason(date: Date): boolean {
  const h = hijri(date);
  return !!h && ((h.month === SHABAN && h.day >= 15) || h.month === RAMADAN);
}

/** The last day of Ramadan, this year's or the coming one's (local midnight). */
export function ramadanLastDay(from: Date): Date | null {
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 400; i++) {
    const today = hijri(day);
    if (!today) {
      return null;
    }
    const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    if (today.month === RAMADAN && hijri(tomorrow)?.month === SHAWWAL) {
      return day;
    }
    // Far from Ramadan, move a few weeks at a time.
    const step = today.month === RAMADAN || (today.month === SHABAN && today.day > 20) ? 1 : 20;
    day.setDate(day.getDate() + step);
  }
  return null;
}

/**
 * When a Ramadan khitma's admin is asked whether the group continues weekly after Eid: from the 20th of Ramadan,
 * or from Eid for khitmas that repeat daily (switching them earlier would end their daily rounds), until the end of
 * Shawwal.
 */
export function isAfterRamadanPromptTime(date: Date, repeatsDaily: boolean): boolean {
  const h = hijri(date);
  if (!h) {
    return false;
  }
  return h.month === SHAWWAL || (!repeatsDaily && h.month === RAMADAN && h.day >= 20);
}

/** The first Friday after Ramadan (local midnight), for a weekly khitma that continues after Eid. */
export function firstFridayAfterRamadan(now: Date): Date {
  const h = hijri(now);
  const last = h?.month === RAMADAN ? ramadanLastDay(now) : null;
  const from = last ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const friday = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  while (friday.getDay() !== 5) {
    friday.setDate(friday.getDate() + 1);
  }
  // Never in the past (or today, once today has begun).
  return friday.getTime() > now.getTime() ? friday : new Date(friday.getTime() + 7 * DAY);
}
