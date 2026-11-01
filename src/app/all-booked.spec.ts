import { suggestedJuz } from './all-booked';
import { Juz, JUZ_STATUS } from './entities/entities';

function ajza(reading: number[]): Juz[] {
  return Array.from({ length: 30 }, (_, i) => {
    const juz = new Juz();
    juz.index = i;
    juz.owner = 'خالد';
    juz.status = reading.includes(i + 1) ? JUZ_STATUS.BOOKED : JUZ_STATUS.DONE;
    return juz;
  });
}

describe('suggestedJuz', () => {
  const morning = new Date(2026, 2, 1, 9, 0);
  const evening = new Date(2026, 2, 1, 21, 0);
  const tomorrow = new Date(2026, 2, 2, 9, 0);

  it('suggests a juz still being read', () => {
    expect([4, 9, 17]).toContain(suggestedJuz(ajza([4, 9, 17]), 'g1', morning));
  });

  it('keeps the same suggestion for a group all day', () => {
    expect(suggestedJuz(ajza([4, 9, 17]), 'g1', evening)).toBe(suggestedJuz(ajza([4, 9, 17]), 'g1', morning));
  });

  it('may suggest another juz on another day or in another group', () => {
    const reading = Array.from({ length: 30 }, (_, i) => i + 1);
    const picks = new Set([morning, tomorrow].flatMap((day) => ['g1', 'g2', 'g3'].map((id) => suggestedJuz(ajza(reading), id, day))));
    expect(picks.size).toBeGreaterThan(1);
  });

  it('goes through the ajza being read, then the others, without repeating', () => {
    const steps = Array.from({ length: 30 }, (_, step) => suggestedJuz(ajza([4, 9, 17]), 'g1', morning, step));
    expect(steps.slice(0, 3).sort((a, b) => a - b)).toEqual([4, 9, 17]);
    expect(new Set(steps).size).toBe(30);
    expect(suggestedJuz(ajza([4, 9, 17]), 'g1', morning, 30)).toBe(steps[0]);
  });
});
