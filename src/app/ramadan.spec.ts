import { firstFridayAfterRamadan, hijri, isAfterRamadanPromptTime, isRamadanSeason, ramadanLastDay } from './ramadan';

// Umm al-Qura: Ramadan 1447 is 18 Feb - 19 Mar 2026 (Eid on Friday 20 Mar); Ramadan 1448 is 8 Feb - 8 Mar 2027.
const noon = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);

describe('Ramadan dates', () => {
  it('reads the Hijri date', () => {
    expect(hijri(noon(2026, 3, 1))).toEqual({ year: 1447, month: 9, day: 12 });
  });

  it('is the season from the middle of Sha’ban to the end of Ramadan', () => {
    expect(isRamadanSeason(noon(2026, 2, 2))).toBe(false); // 14 Sha'ban
    expect(isRamadanSeason(noon(2026, 2, 3))).toBe(true); // 15 Sha'ban
    expect(isRamadanSeason(noon(2026, 3, 19))).toBe(true); // 30 Ramadan
    expect(isRamadanSeason(noon(2026, 3, 20))).toBe(false); // Eid
  });

  it('finds the last day of this Ramadan, or of the next one', () => {
    expect(ramadanLastDay(noon(2026, 3, 1))).toEqual(new Date(2026, 2, 19));
    expect(ramadanLastDay(noon(2026, 2, 10))).toEqual(new Date(2026, 2, 19));
    expect(ramadanLastDay(noon(2026, 10, 28))).toEqual(new Date(2027, 2, 8));
  });

  it('asks about continuing weekly from the 20th of Ramadan, or from Eid for daily khitmas', () => {
    expect(isAfterRamadanPromptTime(noon(2026, 3, 8), false)).toBe(false); // 19 Ramadan
    expect(isAfterRamadanPromptTime(noon(2026, 3, 9), false)).toBe(true); // 20 Ramadan
    expect(isAfterRamadanPromptTime(noon(2026, 3, 9), true)).toBe(false);
    expect(isAfterRamadanPromptTime(noon(2026, 3, 20), true)).toBe(true); // Eid
    expect(isAfterRamadanPromptTime(noon(2026, 4, 18), false)).toBe(false); // Dhu al-Qa'da
  });

  it('continues on the first Friday after Ramadan', () => {
    expect(firstFridayAfterRamadan(noon(2026, 3, 9))).toEqual(new Date(2026, 2, 20));
    expect(firstFridayAfterRamadan(noon(2026, 3, 25))).toEqual(new Date(2026, 2, 27));
    // On a Friday that has begun, the next one.
    expect(firstFridayAfterRamadan(noon(2026, 3, 27))).toEqual(new Date(2026, 3, 3));
  });
});
