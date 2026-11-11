import { Juz, JUZ_STATUS, NUM_OF_AJZA } from './entities/entities';

interface KhitmaKind {
  cycle?: number;
  schedule?: unknown;
  purpose?: string | null;
}

/**
 * Whether a reader with no juz of her own is offered one to read anyway when every juz is taken: in a one-time
 * khitma only, for latecomers. In a khitma that repeats (it has moved on to a next round, repeats on a schedule, or
 * was created as one that repeats), everyone's juz is given out: a reader who sees none has hers under her name
 * written differently, or none today, and members took «اقرأ الجزء …», where their «أتممت قراءة جزء …» button
 * usually is, for that button.
 */
export function offersReadingWhenAllBooked(group: KhitmaKind): boolean {
  return !(group.cycle ?? 0) && !group.schedule && group.purpose !== 'regular';
}

/**
 * When every juz of a khitma is taken, a juz this member can read anyway, for the reward (nothing is booked or
 * recorded): first the ajza still being read, then the others. Each list is in an order that stays the same for a
 * group all day, so the suggestion doesn't change on every visit; `step` moves on to the next one («جزء آخر»).
 */
export function suggestedJuz(ajza: Juz[], groupId: string, today: Date, step = 0): number {
  const seed = daySeed(groupId, today);
  const reading = ajza.filter((juz) => juz.status === JUZ_STATUS.BOOKED).map((juz) => juz.index + 1);
  const others = Array.from({ length: NUM_OF_AJZA }, (_, i) => i + 1).filter((juz) => !reading.includes(juz));
  const rotate = (list: number[]) => list.map((_, i) => list[(i + seed) % list.length]);
  const order = [...rotate(reading), ...rotate(others)];
  return order[step % order.length];
}

function daySeed(groupId: string, today: Date): number {
  const key = `${groupId}|${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
