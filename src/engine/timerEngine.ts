// Drift-free countdown. Remaining time is always derived from a wall-clock anchor,
// never from the number of setInterval callbacks, so background tabs and slow
// renders cannot accumulate error.
import { GAME_DURATION_MS } from '../data/gameConfig';

export interface TimerState {
  running: boolean;
  /** Wall-clock ms when the current run segment started (null while paused). */
  anchorWallMs: number | null;
  /** Remaining ms at the moment of the anchor (or the frozen value while paused). */
  anchorRemainingMs: number;
}

export const clampRemaining = (ms: number): number =>
  Number.isFinite(ms) ? Math.min(GAME_DURATION_MS, Math.max(0, ms)) : GAME_DURATION_MS;

export function createTimer(remainingMs: number = GAME_DURATION_MS): TimerState {
  return { running: false, anchorWallMs: null, anchorRemainingMs: clampRemaining(remainingMs) };
}

export function getRemainingMs(t: TimerState, nowMs: number): number {
  if (!t.running || t.anchorWallMs === null) return clampRemaining(t.anchorRemainingMs);
  const elapsed = Math.max(0, nowMs - t.anchorWallMs);
  return clampRemaining(t.anchorRemainingMs - elapsed);
}

/** Remaining whole seconds as shown on the clock (ceil, so 75:00 shows until a full second passes). */
export const toDisplaySec = (ms: number): number => Math.ceil(clampRemaining(ms) / 1000);

export function startTimer(t: TimerState, nowMs: number): TimerState {
  const rem = getRemainingMs(t, nowMs);
  if (rem <= 0 || t.running) return t;
  return { running: true, anchorWallMs: nowMs, anchorRemainingMs: rem };
}

export function pauseTimer(t: TimerState, nowMs: number): TimerState {
  if (!t.running) return t;
  return { running: false, anchorWallMs: null, anchorRemainingMs: getRemainingMs(t, nowMs) };
}

/** Jump to an absolute remaining time, keeping the run/pause state. */
export function setRemaining(t: TimerState, remainingMs: number, nowMs: number): TimerState {
  const rem = clampRemaining(remainingMs);
  if (t.running && rem > 0) return { running: true, anchorWallMs: nowMs, anchorRemainingMs: rem };
  return { running: false, anchorWallMs: null, anchorRemainingMs: rem };
}

export function adjustTimer(t: TimerState, deltaMs: number, nowMs: number): TimerState {
  return setRemaining(t, getRemainingMs(t, nowMs) + deltaMs, nowMs);
}

/** mm:ss for a remaining-ms value. */
export function formatClock(ms: number): string {
  return formatSec(toDisplaySec(ms));
}

export function formatSec(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
