import { describe, expect, it } from 'vitest';
import { SCHEDULE } from '../data/events';
import { findCrossedEvents, nextUpcomingEvent, shouldBeep } from '../engine/eventScheduler';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('central schedule', () => {
  it('contains every required moment', () => {
    const at = (sec: number) => ids(SCHEDULE.filter((e) => e.remainingSeconds === sec));
    expect(at(3900)).toEqual(['phase:market', 'round:1:close']);
    expect(at(3300)).toEqual(['round:2:close', 'round:1:draw']);
    expect(at(2700)).toEqual(['round:3:close', 'round:2:draw']);
    expect(at(2400)).toEqual(['news:cocoaHarvest']);
    expect(at(2100)).toEqual(['round:4:close', 'round:3:draw']);
    expect(at(1500)).toEqual(['round:5:close', 'round:4:draw', 'news:cheeseShortage']);
    expect(at(900)).toEqual(['phase:lastCall', 'round:5:draw']);
    expect(at(600)).toEqual(['phase:closed']);
    expect(at(0)).toEqual(['phase:end']);
    expect(new Set(ids(SCHEDULE)).size).toBe(SCHEDULE.length);
  });
});

describe('findCrossedEvents', () => {
  it('fires an event when the clock lands exactly on it', () => {
    expect(ids(findCrossedEvents(SCHEDULE, 3901, 3900, []))).toEqual(['phase:market', 'round:1:close']);
  });

  it('does not fire before the moment', () => {
    expect(findCrossedEvents(SCHEDULE, 3902, 3901, [])).toEqual([]);
  });

  it('at 25:00 investment events come before the cheese news', () => {
    expect(ids(findCrossedEvents(SCHEDULE, 1501, 1500, []))).toEqual(['round:5:close', 'round:4:draw', 'news:cheeseShortage']);
  });

  it('never fires while time is unchanged (paused) or moving backwards', () => {
    expect(findCrossedEvents(SCHEDULE, 3900, 3900, [])).toEqual([]);
    expect(findCrossedEvents(SCHEDULE, 3800, 3960, [])).toEqual([]);
  });

  it('does not re-fire executed events after rewinding and replaying', () => {
    const first = ids(findCrossedEvents(SCHEDULE, 3901, 3899, []));
    expect(first).toContain('round:1:close');
    expect(findCrossedEvents(SCHEDULE, 3961, 3899, first)).toEqual([]);
  });

  it('a big forward jump returns every skipped event in game order', () => {
    const got = ids(findCrossedEvents(SCHEDULE, 4500, 900, []));
    expect(got).toEqual([
      'phase:market', 'round:1:close',
      'round:2:close', 'round:1:draw',
      'round:3:close', 'round:2:draw',
      'news:cocoaHarvest',
      'round:4:close', 'round:3:draw',
      'round:5:close', 'round:4:draw', 'news:cheeseShortage',
      'phase:lastCall', 'round:5:draw',
    ]);
  });

  it('fires the end event at 00:00', () => {
    expect(ids(findCrossedEvents(SCHEDULE, 1, 0, []))).toEqual(['phase:end']);
  });
});

describe('helpers', () => {
  it('nextUpcomingEvent', () => {
    expect(nextUpcomingEvent(SCHEDULE, 4500)?.id).toBe('phase:market');
    expect(nextUpcomingEvent(SCHEDULE, 3900)?.id).toBe('round:2:close');
    expect(nextUpcomingEvent(SCHEDULE, 0)).toBeNull();
  });
  it('beeps 1–5 s before key moments only', () => {
    expect(shouldBeep([3900], 3905)).toBe(true);
    expect(shouldBeep([3900], 3901)).toBe(true);
    expect(shouldBeep([3900], 3900)).toBe(false);
    expect(shouldBeep([3900], 3906)).toBe(false);
  });
});
