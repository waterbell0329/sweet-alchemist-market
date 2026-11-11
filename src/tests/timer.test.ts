import { describe, expect, it } from 'vitest';
import { adjustTimer, createTimer, formatClock, getRemainingMs, pauseTimer, setRemaining, startTimer, toDisplaySec } from '../engine/timerEngine';

describe('timer engine', () => {
  it('starts at exactly 75:00', () => {
    const t = createTimer();
    expect(getRemainingMs(t, 0)).toBe(4_500_000);
    expect(formatClock(getRemainingMs(t, 0))).toBe('75:00');
  });

  it('derives time from the wall clock, not from tick counts', () => {
    const t = startTimer(createTimer(), 1000);
    // Whatever happened between (throttled tab, slow renders), only the anchor matters.
    expect(getRemainingMs(t, 1000 + 61_500)).toBe(4_500_000 - 61_500);
    expect(formatClock(getRemainingMs(t, 1000 + 61_500))).toBe('73:59');
  });

  it('does not decrease while paused', () => {
    let t = startTimer(createTimer(), 0);
    t = pauseTimer(t, 10_000);
    expect(getRemainingMs(t, 10_000)).toBe(4_490_000);
    expect(getRemainingMs(t, 999_999)).toBe(4_490_000);
    t = startTimer(t, 1_000_000);
    expect(getRemainingMs(t, 1_005_000)).toBe(4_485_000);
  });

  it('clamps to 0–4500 s and never goes negative', () => {
    const t = startTimer(createTimer(), 0);
    expect(getRemainingMs(t, 10_000_000)).toBe(0);
    expect(getRemainingMs(adjustTimer(createTimer(), 60_000, 0), 0)).toBe(4_500_000);
    expect(getRemainingMs(adjustTimer(createTimer(10_000), -60_000, 0), 0)).toBe(0);
    expect(getRemainingMs(setRemaining(createTimer(), NaN, 0), 0)).toBe(4_500_000);
  });

  it('±1 minute keeps running state and re-anchors', () => {
    let t = startTimer(createTimer(), 0);
    t = adjustTimer(t, -60_000, 5_000);
    expect(t.running).toBe(true);
    expect(getRemainingMs(t, 5_000)).toBe(4_500_000 - 5_000 - 60_000);
    t = adjustTimer(t, +60_000, 5_000);
    expect(getRemainingMs(t, 6_000)).toBe(4_494_000);
  });

  it('cannot start at 00:00', () => {
    const t = createTimer(0);
    expect(startTimer(t, 0).running).toBe(false);
  });

  it('display seconds use ceil so 00:00 appears only at zero', () => {
    expect(toDisplaySec(1)).toBe(1);
    expect(toDisplaySec(0)).toBe(0);
    expect(toDisplaySec(3_900_000)).toBe(3900);
    expect(toDisplaySec(3_900_001)).toBe(3901);
  });
});
