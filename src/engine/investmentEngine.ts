import { GOLD_VALUE, GRADES, MAX_GOLD_PER_DRAW, type Grade, type RoundConfig } from '../data/gameConfig';
import { OUTCOMES, OUTCOME_BY_ID, type Outcome, type OutcomeId } from '../data/investments';

/** A source of uniformly distributed unsigned 32-bit integers. */
export type Uint32Source = () => number;

export const cryptoUint32: Uint32Source = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
};

const UINT32_RANGE = 0x1_0000_0000; // 2^32

/**
 * Unbiased integer in [0, maxExclusive) via rejection sampling: values in the
 * incomplete top "bucket" are thrown away, so every result has exactly equal weight.
 */
export function unbiasedInt(maxExclusive: number, source: Uint32Source = cryptoUint32): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError('maxExclusive must be an integer in (0, 2^32]');
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  for (let i = 0; i < 1000; i++) {
    const x = source() >>> 0;
    if (x < limit) return x % maxExclusive;
  }
  throw new Error('Random source failed to produce an acceptable value');
}

/** Integer 0–99 with no modulo bias. */
export const rollPercent = (source: Uint32Source = cryptoUint32): number => unbiasedInt(100, source);

export interface OutcomeRange {
  id: OutcomeId;
  start: number; // inclusive
  end: number; // inclusive
}

/** Cumulative probability bands, e.g. 0–14, 15–34, 35–64, 65–89, 90–99. */
export function buildRanges(outcomes: readonly Outcome[] = OUTCOMES): OutcomeRange[] {
  const total = outcomes.reduce((s, o) => s + o.probability, 0);
  if (total !== 100) throw new Error(`Outcome probabilities must sum to 100 (got ${total})`);
  let cursor = 0;
  return outcomes.map((o) => {
    const r = { id: o.id, start: cursor, end: cursor + o.probability - 1 };
    cursor += o.probability;
    return r;
  });
}

export const OUTCOME_RANGES = buildRanges();

export function outcomeForRoll(roll: number): Outcome {
  if (!Number.isInteger(roll) || roll < 0 || roll > 99) throw new RangeError(`roll out of range: ${roll}`);
  const band = OUTCOME_RANGES.find((r) => roll >= r.start && roll <= r.end)!;
  return OUTCOME_BY_ID[band.id];
}

/** Result is decided here, *before* any animation starts. */
export function drawOutcome(source: Uint32Source = cryptoUint32): { roll: number; outcome: Outcome } {
  const roll = rollPercent(source);
  return { roll, outcome: outcomeForRoll(roll) };
}

/** Total coins returned for one gold coin (5 coins): 2, 4, 6, 10, 15. */
export function returnPerGold(outcomeId: OutcomeId): number {
  const pct = OUTCOME_BY_ID[outcomeId].returnPct;
  return Math.round((GOLD_VALUE * (100 + pct)) / 100);
}

export function payoutCoins(outcomeId: OutcomeId, gold: number): number {
  return returnPerGold(outcomeId) * gold;
}

export function splitCoins(total: number): { gold: number; silver: number } {
  const t = Math.max(0, Math.floor(total));
  return { gold: Math.floor(t / GOLD_VALUE), silver: t % GOLD_VALUE };
}

export type InputError = 'notInteger' | 'tooSmall' | 'tooLarge';

export function validateGold(n: unknown, max = MAX_GOLD_PER_DRAW): InputError | null {
  if (typeof n !== 'number' || !Number.isInteger(n)) return 'notInteger';
  if (n < 1) return 'tooSmall';
  if (n > max) return 'tooLarge';
  return null;
}

export function validateStudent(n: unknown, grade: Grade): InputError | null {
  if (typeof n !== 'number' || !Number.isInteger(n)) return 'notInteger';
  if (n < 1) return 'tooSmall';
  if (n > GRADES[grade].students) return 'tooLarge';
  return null;
}

/* ---------------- Round status ---------------- */

export type RoundStatus = 'upcoming' | 'open' | 'closed' | 'waiting' | 'drawable' | 'drawing' | 'drawn';

export interface RoundProgress {
  mode: 'index' | 'individual';
  confirmedClosed: boolean;
  completed: boolean;
  indexRecordId: string | null;
  /** studentNumber → record uid (latest valid draw) */
  individual: Record<string, string>;
}

export function createRoundProgress(): RoundProgress {
  return { mode: 'index', confirmedClosed: false, completed: false, indexRecordId: null, individual: {} };
}

export function roundStatus(cfg: RoundConfig, sec: number, p: RoundProgress): RoundStatus {
  if (p.completed) return 'drawn';
  if (sec > cfg.openFrom) return 'upcoming';
  if (sec > cfg.close) return 'open';
  if (sec > cfg.draw) return p.confirmedClosed ? 'waiting' : 'closed';
  return Object.keys(p.individual).length > 0 ? 'drawing' : 'drawable';
}

export const canDraw = (s: RoundStatus): boolean => s === 'drawable' || s === 'drawing';
