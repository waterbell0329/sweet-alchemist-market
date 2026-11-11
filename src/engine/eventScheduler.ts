// Central event scheduler: pure functions that decide which scheduled events fire
// when the game clock moves from one remaining-second to another.
import type { ScheduledEvent } from '../data/events';

/**
 * Events whose moment lies in (curSec, prevSec] going *down* the countdown — i.e. the
 * clock passed or landed on them — and that have not been executed before.
 * Moving the clock backwards (curSec >= prevSec) never fires anything, and executed IDs
 * are never fired again even when the clock crosses them a second time.
 * Result is chronological (earliest in the game first), then by priority.
 */
export function findCrossedEvents(
  events: readonly ScheduledEvent[],
  prevSec: number,
  curSec: number,
  executed: ReadonlySet<string> | readonly string[],
): ScheduledEvent[] {
  if (curSec >= prevSec) return [];
  const done = executed instanceof Set ? executed : new Set(executed as readonly string[]);
  return events
    .filter((e) => !done.has(e.id) && prevSec > e.remainingSeconds && curSec <= e.remainingSeconds)
    .sort((a, b) => b.remainingSeconds - a.remainingSeconds || a.priority - b.priority);
}

/** The next not-yet-reached event (strictly below the current second). */
export function nextUpcomingEvent(events: readonly ScheduledEvent[], curSec: number): ScheduledEvent | null {
  let best: ScheduledEvent | null = null;
  for (const e of events) {
    if (e.remainingSeconds < curSec && (!best || e.remainingSeconds > best.remainingSeconds ||
      (e.remainingSeconds === best.remainingSeconds && e.priority < best.priority))) best = e;
  }
  return best;
}

/** True when a countdown beep should sound at `sec` (1–5 s before a target). */
export function shouldBeep(targets: readonly number[], sec: number, lead = 5): boolean {
  return targets.some((t) => sec - t >= 1 && sec - t <= lead);
}
