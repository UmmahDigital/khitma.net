import { KHITMA_GROUP_TYPE } from './entities/entities';
import { ONE_TIME_PURPOSES, Purpose } from './purpose';
import { RoundSchedule, scheduleParams } from './schedule';

interface LikeableGroup {
  type?: string;
  purpose?: string | null;
  schedule?: RoundSchedule | null;
  cycle?: number;
}

/**
 * «ابدأ ختمة مثلها»: the create page's link for a khitma like this one, with its kind (one-time or recurring, and how
 * the Quran is shared out), what it is for, and how it repeats. Never its title or anyone's name: those belong to
 * this khitma, and the new one is someone else's.
 */
export function startLikeParams(group: LikeableGroup, source: string): Record<string, string> {
  const from = { from: source };
  if (group.type === KHITMA_GROUP_TYPE.SAME_TASK) {
    return { type: 'recurring.sametask', ...from };
  }
  if (group.type === KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION) {
    return { type: 'onetime.pagesdistribution', ...from };
  }
  const purpose = group.purpose as Purpose | undefined;
  const schedule = group.schedule ?? null;
  if (purpose === 'ramadan' && schedule?.every === 'day') {
    return { type: 'recurring.sequential', template: 'ramadan-daily', ...from };
  }
  if (schedule) {
    return { type: 'recurring.sequential', ...scheduleParams(schedule), ...from };
  }
  if (purpose && ONE_TIME_PURPOSES.includes(purpose)) {
    return { type: 'onetime.sequential', purpose, ...from };
  }
  // Groups from before purposes were recorded: one that has started a second round is a recurring one.
  const recurring = purpose === 'regular' || (!purpose && (group.cycle ?? 0) > 0);
  return { type: recurring ? 'recurring.sequential' : 'onetime.sequential', ...from };
}
