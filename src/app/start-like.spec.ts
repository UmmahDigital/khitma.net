import { KHITMA_GROUP_TYPE } from './entities/entities';
import { startLikeParams } from './start-like';

describe('startLikeParams', () => {
  const sequential = KHITMA_GROUP_TYPE.SEQUENTIAL;

  it('starts a one-time khitma for the same purpose, without names', () => {
    const params = startLikeParams({ type: sequential, purpose: 'memorial', cycle: 0 }, 'completion');
    expect(params).toEqual({ type: 'onetime.sequential', purpose: 'memorial', from: 'completion' });
  });

  it('starts a recurring khitma that repeats the same way', () => {
    const params = startLikeParams({ type: sequential, purpose: 'regular', schedule: { every: 'week', weekday: 5, cycleType: 1 } }, 'menu');
    expect(params).toEqual({ type: 'recurring.sequential', every: 'week', weekday: '5', cycle: '1', from: 'menu' });
  });

  it('a one-time khitma that was later set to repeat is started as a recurring one', () => {
    const params = startLikeParams({ type: sequential, purpose: 'memorial', schedule: { every: 'completion', cycleType: 3 } }, 'menu');
    expect(params).toEqual({ type: 'recurring.sequential', every: 'completion', cycle: '3', from: 'menu' });
  });

  it('starts a daily Ramadan khitma from the Ramadan template', () => {
    const params = startLikeParams({ type: sequential, purpose: 'ramadan', schedule: { every: 'day', cycleType: 1 } }, 'menu');
    expect(params).toEqual({ type: 'recurring.sequential', template: 'ramadan-daily', from: 'menu' });
  });

  it('keeps how the Quran is shared out', () => {
    expect(startLikeParams({ type: KHITMA_GROUP_TYPE.SAME_TASK }, 'menu').type).toBe('recurring.sametask');
    expect(startLikeParams({ type: KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION }, 'menu').type).toBe('onetime.pagesdistribution');
  });

  it('treats a group from before purposes were recorded as recurring once it has had a second round', () => {
    expect(startLikeParams({ type: sequential, cycle: 0 }, 'menu').type).toBe('onetime.sequential');
    expect(startLikeParams({ type: sequential, cycle: 3 }, 'menu').type).toBe('recurring.sequential');
    expect(startLikeParams({ cycle: 0 }, 'menu').type).toBe('onetime.sequential');
  });
});
