import { JUZ_STATUS, KHITMA_CYCLE_TYPE, Juz } from './entities/entities';
import { nextRoundAjza } from './khitma-group.service';
import {
  describeSchedule,
  firstRoundAt,
  isRoundDue,
  nextRoundAfterManualStart,
  nextRoundAt,
  repeatText,
  RoundSchedule,
  ruleText,
  savedScheduleText,
  scheduleFromParams,
  scheduleParams,
  whenText,
} from './schedule';

const { IDLE, BOOKED, DONE } = JUZ_STATUS;
const at = (date: Date) => ({ toMillis: () => date.getTime(), toDate: () => date });
const weekly = (weekday: number): RoundSchedule => ({ every: 'week', weekday, cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK });

function ajza(assigned: Record<number, [string, number]>): Juz[] {
  return Array.from({ length: 30 }, (_, index) => {
    const [owner, status] = assigned[index + 1] ?? ['', IDLE];
    return new Juz({ index, owner, status });
  });
}

describe('repeating khitmas', () => {
  // Wednesday 4 March 2026, 10:00 local time.
  const wednesday = new Date(2026, 2, 4, 10);

  it('starts rounds at the next local midnight of the rhythm', () => {
    expect(nextRoundAt(weekly(5), wednesday)).toEqual(new Date(2026, 2, 6));
    expect(nextRoundAt(weekly(3), wednesday)).toEqual(new Date(2026, 2, 11));
    expect(nextRoundAt({ every: 'day', cycleType: 1 }, wednesday)).toEqual(new Date(2026, 2, 5));
    expect(nextRoundAt({ every: 'month', cycleType: 1 }, wednesday)).toEqual(new Date(2026, 3, 1));
    expect(nextRoundAt({ every: 'completion', cycleType: 1 }, wednesday)).toBeNull();
    // Strictly after: at Friday midnight itself, the next one is a week later.
    expect(nextRoundAt(weekly(5), new Date(2026, 2, 6))).toEqual(new Date(2026, 2, 13));
  });

  it('is due once its time has come', () => {
    const now = wednesday.getTime();
    expect(isRoundDue({ schedule: weekly(5), nextRoundAt: at(new Date(2026, 2, 4)) }, now)).toBe(true);
    expect(isRoundDue({ schedule: weekly(5), nextRoundAt: at(new Date(2026, 2, 6)) }, now)).toBe(false);
    expect(isRoundDue({ schedule: weekly(5) }, now)).toBe(false);
    expect(isRoundDue({ nextRoundAt: at(new Date(2026, 2, 4)) }, now)).toBe(false);
  });

  it('after a completion, waits a few hours so everyone sees it complete', () => {
    const now = wednesday.getTime();
    const schedule: RoundSchedule = { every: 'completion', cycleType: 1 };
    const complete = ajza(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, ['سارة', DONE]])));
    const hoursAgo = (hours: number) => at(new Date(now - hours * 3_600_000));

    expect(isRoundDue({ schedule, ajza: ajza({ 1: ['سارة', DONE] }), cycle: 2 }, now)).toBe(false);
    expect(isRoundDue({ schedule, ajza: complete, cycle: 2, completedRounds: { '2': hoursAgo(7) } }, now)).toBe(true);
    expect(isRoundDue({ schedule, ajza: complete, cycle: 2, completedRounds: { '2': hoursAgo(1) } }, now)).toBe(false);
    // Just completed on this phone: the time is still on its way to the server.
    expect(isRoundDue({ schedule, ajza: complete, cycle: 2, completedRounds: { '2': null } }, now)).toBe(false);
    // Completed before completion times were recorded.
    expect(isRoundDue({ schedule, ajza: complete, cycle: 2, completedRounds: { '1': hoursAgo(200) } }, now)).toBe(true);
    expect(isRoundDue({ schedule, ajza: complete, cycle: 2 }, now)).toBe(true);
  });

  it('tells members when the next round starts', () => {
    const group = { schedule: weekly(5), nextRoundAt: at(new Date(2026, 2, 6)) };
    expect(repeatText(group, {}, 'ar', wednesday)).toBe('تبدأ الختمة التالية تلقائيًا يوم الجمعة 6/3');
    expect(repeatText({ schedule: { every: 'day', cycleType: 1 }, nextRoundAt: at(new Date(2026, 2, 5)) }, {}, 'ar', wednesday)).toBe(
      'تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل'
    );
    expect(repeatText({ schedule: { every: 'completion', cycleType: 1 } }, {}, 'ar')).toBe('تبدأ الختمة التالية تلقائيًا بعد اكتمال هذه الختمة');
    expect(repeatText({}, {}, 'ar')).toBeNull();
    expect(repeatText({ schedule: weekly(5) }, {}, 'ar')).toBeNull();
  });

  it('says when, from where the reader is: tonight, today, tomorrow, yesterday or a date', () => {
    const when = (date: Date) => whenText(date, wednesday, {}, 'ar');
    expect(when(new Date(2026, 2, 5))).toBe('الليلة عند منتصف الليل');
    expect(when(new Date(2026, 2, 4, 18))).toBe('اليوم الساعة 18:00');
    expect(when(new Date(2026, 2, 5, 5, 30))).toBe('غدًا الساعة 05:30');
    expect(when(new Date(2026, 2, 3, 0, 24))).toBe('أمس الساعة 00:24');
    expect(when(new Date(2026, 2, 6))).toBe('يوم الجمعة 6/3');
    expect(when(new Date(2026, 2, 13, 18))).toBe('يوم الجمعة 13/3 الساعة 18:00');
    // Other languages carry their own prepositions.
    const english = { schedule: { tonight: 'tonight at midnight', onDate: 'on {date}' } };
    expect(whenText(new Date(2026, 2, 5), wednesday, english, 'en')).toBe('tonight at midnight');
    expect(whenText(new Date(2026, 2, 6), wednesday, english, 'en')).toBe('on Friday, 3/6');
  });
});

describe('a round started by hand in a khitma that repeats', () => {
  const daily: RoundSchedule = { every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };

  it('stands in for the next automatic start, so the khitma moves on once', () => {
    // Started at 18:00 for tomorrow: tonight's automatic start is skipped, the next one is the night after.
    const evening = new Date(2026, 2, 4, 18);
    expect(nextRoundAfterManualStart(daily, new Date(2026, 2, 5), evening)).toEqual(new Date(2026, 2, 6));
    expect(nextRoundAfterManualStart(weekly(5), new Date(2026, 2, 6), evening)).toEqual(new Date(2026, 2, 13));
    // An automatic start that was due and hadn't happened yet (nobody had opened the khitma): this is it.
    const morning = new Date(2026, 2, 5, 7);
    expect(nextRoundAfterManualStart(daily, new Date(2026, 2, 5), morning)).toEqual(new Date(2026, 2, 6));
    expect(nextRoundAfterManualStart(daily, null, morning)).toEqual(new Date(2026, 2, 6));
    expect(nextRoundAfterManualStart({ every: 'completion', cycleType: 1 }, null, morning)).toBeNull();
  });
});

describe('the first automatic start', () => {
  const daily: RoundSchedule = { every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };
  const now = new Date(2026, 2, 4, 18, 5);

  it('doesn’t cut short a round that has only just started', () => {
    // Tomorrow's round was started by hand at 18:00, then the khitma was set to repeat every day.
    expect(firstRoundAt(daily, now, { startedAt: new Date(2026, 2, 4, 18) })).toEqual(new Date(2026, 2, 6));
    // A khitma created at 23:00 doesn't move on an hour later.
    expect(firstRoundAt(daily, new Date(2026, 2, 4, 23), { startedAt: new Date(2026, 2, 4, 23) })).toEqual(new Date(2026, 2, 6));
    // Weekly: a round started on Tuesday runs until the Friday after next.
    expect(firstRoundAt(weekly(5), new Date(2026, 2, 3, 9), { startedAt: new Date(2026, 2, 3, 9) })).toEqual(new Date(2026, 2, 13));
  });

  it('is the next one of the rhythm otherwise', () => {
    // Started this morning at Fajr: tonight's midnight is more than half a day later.
    expect(firstRoundAt(daily, now, { startedAt: new Date(2026, 2, 4, 5) })).toEqual(new Date(2026, 2, 5));
    expect(firstRoundAt(weekly(5), now, { startedAt: new Date(2026, 2, 1) })).toEqual(new Date(2026, 2, 6));
    // A completed khitma has nothing to protect; nor does one whose start isn't known.
    expect(firstRoundAt(daily, now, { startedAt: new Date(2026, 2, 4, 18), complete: true })).toEqual(new Date(2026, 2, 5));
    expect(firstRoundAt(daily, now)).toEqual(new Date(2026, 2, 5));
    expect(firstRoundAt({ every: 'completion', cycleType: 1 }, now, { startedAt: now })).toBeNull();
  });
});

describe('a new round', () => {
  const last = ajza({ 1: ['سارة', DONE], 2: ['خالد', BOOKED], 30: ['ليلى', DONE] });
  const owners = (round: Juz[]) => round.map((juz) => [juz.owner, juz.status]);
  const expected = (assigned: Record<number, [string, number]>) => owners(ajza(assigned));

  it('gives everyone the juz after theirs', () => {
    expect(owners(nextRoundAjza(last, KHITMA_CYCLE_TYPE.AUTO_BOOK))).toEqual(
      expected({ 1: ['ليلى', BOOKED], 2: ['سارة', BOOKED], 3: ['خالد', BOOKED] })
    );
  });

  it('or only to those who finished', () => {
    expect(owners(nextRoundAjza(last, KHITMA_CYCLE_TYPE.AUTO_BOOK_FOR_DONE_ONLY))).toEqual(
      expected({ 1: ['ليلى', BOOKED], 2: ['سارة', BOOKED] })
    );
  });

  it('or frees every juz, or goes one step back', () => {
    expect(owners(nextRoundAjza(last, KHITMA_CYCLE_TYPE.ALL_IDLE)).every(([, status]) => status === IDLE)).toBe(true);
    expect(owners(nextRoundAjza(last, KHITMA_CYCLE_TYPE.REWIND))).toEqual(
      expected({ 1: ['خالد', BOOKED], 29: ['ليلى', BOOKED], 30: ['سارة', BOOKED] })
    );
  });
});

describe('a schedule in a link', () => {
  it('comes back as it went', () => {
    const schedules: RoundSchedule[] = [
      { every: 'week', weekday: 1, cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK },
      { every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK },
      { every: 'month', cycleType: KHITMA_CYCLE_TYPE.ALL_IDLE },
      { every: 'completion', cycleType: KHITMA_CYCLE_TYPE.REWIND },
    ];
    for (const schedule of schedules) {
      expect(scheduleFromParams(scheduleParams(schedule))).toEqual(schedule);
    }
  });

  it('is ignored when the link asks for something unknown', () => {
    expect(scheduleFromParams({})).toBeNull();
    expect(scheduleFromParams({ every: 'year', cycle: '1' })).toBeNull();
    expect(scheduleFromParams({ every: 'day', cycle: '9' })).toBeNull();
    expect(scheduleFromParams({ every: 'week', weekday: '7', cycle: '1' })).toBeNull();
  });

  it('says how the khitma repeats', () => {
    const friday: RoundSchedule = { every: 'week', weekday: 5, cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };
    expect(ruleText(friday, {}, 'ar')).toBe('كل أسبوع، يوم: الجمعة');
    expect(ruleText(friday, { schedule: { week: 'Every week, on' } }, 'en')).toBe('Every week, on Friday');
    expect(ruleText({ every: 'completion', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK }, {}, 'ar')).toBe('بعد اكتمال كل ختمة');
  });

  it('says, before it is saved, what the repeat will do', () => {
    expect(describeSchedule({ every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK }, {}, 'ar')).toBe(
      'مع بداية كل يوم تبدأ ختمة جديدة تلقائيًا: ينتقل كل عضو إلى الجزء الذي يلي جزءه، أتمّه أم لم يتمّه. لا حاجة لبدئها بنفسك.'
    );
    expect(describeSchedule({ every: 'week', weekday: 4, cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK_FOR_DONE_ONLY }, {}, 'ar')).toBe(
      'مع بداية يوم الخميس من كل أسبوع تبدأ ختمة جديدة تلقائيًا: ينتقل من أتمّ جزءه إلى الجزء الذي يليه، ويُتاح الباقي للاختيار. لا حاجة لبدئها بنفسك.'
    );
    const english = { schedule: { ruleWeek: 'At the start of every {weekday}', describe: '{rule}, a new khitma starts automatically: {effect}.', effectAllIdle: 'every juz is free again' } };
    expect(describeSchedule({ every: 'week', weekday: 5, cycleType: KHITMA_CYCLE_TYPE.ALL_IDLE }, english, 'en')).toBe(
      'At the start of every Friday, a new khitma starts automatically: every juz is free again.'
    );
  });

  it('and, once saved, when it first starts', () => {
    const daily: RoundSchedule = { every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };
    const now = new Date(2026, 2, 4, 10);
    expect(savedScheduleText(daily, new Date(2026, 2, 5), {}, 'ar', now)).toBe(
      'تمّ الحفظ. تبدأ الختمة التالية تلقائيًا الليلة عند منتصف الليل، فلا حاجة لبدئها بنفسك.'
    );
    expect(savedScheduleText({ every: 'completion', cycleType: 1 }, null, {}, 'ar', now)).toContain('بعد اكتمال هذه الختمة');
    expect(savedScheduleText(null, null, {}, 'ar', now)).toBe('تمّ إيقاف التكرار: ابدأ كل ختمة بنفسك.');
  });
});
