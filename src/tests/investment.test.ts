import { describe, expect, it } from 'vitest';
import { OUTCOMES } from '../data/investments';
import { ROUND_SCHEDULE } from '../data/gameConfig';
import {
  OUTCOME_RANGES,
  createRoundProgress,
  drawOutcome,
  outcomeForRoll,
  payoutCoins,
  returnPerGold,
  rollPercent,
  roundStatus,
  splitCoins,
  unbiasedInt,
  validateGold,
  validateStudent,
} from '../engine/investmentEngine';

describe('probabilities', () => {
  it('sum to exactly 100%', () => {
    expect(OUTCOMES.reduce((s, o) => s + o.probability, 0)).toBe(100);
  });

  it('map roll bands exactly as specified (0–14, 15–34, 35–64, 65–89, 90–99)', () => {
    expect(OUTCOME_RANGES).toEqual([
      { id: 'bankrupt', start: 0, end: 14 },
      { id: 'loss', start: 15, end: 34 },
      { id: 'interest', start: 35, end: 64 },
      { id: 'bigWin', start: 65, end: 89 },
      { id: 'jackpot', start: 90, end: 99 },
    ]);
  });

  it('every one of the 100 rolls maps to an outcome with counts equal to the probability', () => {
    const counts: Record<string, number> = {};
    for (let r = 0; r < 100; r++) {
      const o = outcomeForRoll(r);
      counts[o.id] = (counts[o.id] ?? 0) + 1;
    }
    for (const o of OUTCOMES) expect(counts[o.id]).toBe(o.probability);
  });

  it('boundaries', () => {
    expect(outcomeForRoll(0).id).toBe('bankrupt');
    expect(outcomeForRoll(14).id).toBe('bankrupt');
    expect(outcomeForRoll(15).id).toBe('loss');
    expect(outcomeForRoll(34).id).toBe('loss');
    expect(outcomeForRoll(35).id).toBe('interest');
    expect(outcomeForRoll(64).id).toBe('interest');
    expect(outcomeForRoll(65).id).toBe('bigWin');
    expect(outcomeForRoll(89).id).toBe('bigWin');
    expect(outcomeForRoll(90).id).toBe('jackpot');
    expect(outcomeForRoll(99).id).toBe('jackpot');
    expect(() => outcomeForRoll(100)).toThrow();
    expect(() => outcomeForRoll(-1)).toThrow();
    expect(() => outcomeForRoll(3.5)).toThrow();
  });
});

describe('unbiased random integers', () => {
  it('rejects values in the incomplete top bucket (no modulo bias)', () => {
    const limit = 2 ** 32 - (2 ** 32 % 100); // 4294967200
    const seq = [limit, 2 ** 32 - 1, limit + 50, 205];
    let i = 0;
    expect(unbiasedInt(100, () => seq[i++])).toBe(5);
    expect(i).toBe(4);
  });

  it('accepts the highest value below the limit', () => {
    const limit = 2 ** 32 - (2 ** 32 % 100);
    expect(unbiasedInt(100, () => limit - 1)).toBe(99);
    expect(unbiasedInt(100, () => 0)).toBe(0);
  });

  it('rollPercent stays within 0–99 using the real crypto source', () => {
    for (let i = 0; i < 5000; i++) {
      const r = rollPercent();
      expect(Number.isInteger(r) && r >= 0 && r <= 99).toBe(true);
    }
  });

  it('drawOutcome uses the roll to pick the outcome', () => {
    expect(drawOutcome(() => 95).outcome.id).toBe('jackpot');
    expect(drawOutcome(() => 7).outcome.id).toBe('bankrupt');
  });

  it('statistical check (reference only): 200k crypto draws land near the target probabilities', () => {
    const n = 200_000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const id = drawOutcome().outcome.id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    for (const o of OUTCOMES) {
      const p = o.probability / 100;
      const sd = Math.sqrt((p * (1 - p)) / n);
      expect(Math.abs(counts[o.id] / n - p)).toBeLessThan(6 * sd);
    }
  });
});

describe('payouts', () => {
  it('1 gold returns 2, 4, 6, 10, 15 coins', () => {
    expect(OUTCOMES.map((o) => returnPerGold(o.id))).toEqual([2, 4, 6, 10, 15]);
  });

  it('2 gold at +20% returns 12 coins = 2 gold + 2 silver', () => {
    expect(payoutCoins('interest', 2)).toBe(12);
    expect(splitCoins(12)).toEqual({ gold: 2, silver: 2 });
  });

  it('matches the spec table for 1 gold', () => {
    expect(splitCoins(payoutCoins('bankrupt', 1))).toEqual({ gold: 0, silver: 2 });
    expect(splitCoins(payoutCoins('loss', 1))).toEqual({ gold: 0, silver: 4 });
    expect(splitCoins(payoutCoins('interest', 1))).toEqual({ gold: 1, silver: 1 });
    expect(splitCoins(payoutCoins('bigWin', 1))).toEqual({ gold: 2, silver: 0 });
    expect(splitCoins(payoutCoins('jackpot', 1))).toEqual({ gold: 3, silver: 0 });
  });

  it('scales linearly and always returns whole coins', () => {
    for (let g = 1; g <= 20; g++) for (const o of OUTCOMES) {
      const c = payoutCoins(o.id, g);
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBe(Math.round(g * 5 * (1 + o.returnPct / 100)));
    }
  });
});

describe('input validation', () => {
  it('gold', () => {
    expect(validateGold(1)).toBeNull();
    expect(validateGold(0)).toBe('tooSmall');
    expect(validateGold(-3)).toBe('tooSmall');
    expect(validateGold(1.5)).toBe('notInteger');
    expect(validateGold(NaN)).toBe('notInteger');
    expect(validateGold(21)).toBe('tooLarge');
  });
  it('student range per grade', () => {
    expect(validateStudent(22, 4)).toBeNull();
    expect(validateStudent(23, 4)).toBe('tooLarge');
    expect(validateStudent(30, 6)).toBeNull();
    expect(validateStudent(31, 6)).toBe('tooLarge');
    expect(validateStudent(0, 6)).toBe('tooSmall');
  });
});

describe('round schedule & status', () => {
  it('has exactly 5 rounds, each drawing exactly 10 minutes after close', () => {
    expect(ROUND_SCHEDULE).toHaveLength(5);
    expect(ROUND_SCHEDULE.map((r) => [r.openFrom, r.close, r.draw])).toEqual([
      [4500, 3900, 3300],
      [3900, 3300, 2700],
      [3300, 2700, 2100],
      [2700, 2100, 1500],
      [2100, 1500, 900],
    ]);
    for (const r of ROUND_SCHEDULE) expect(r.close - r.draw).toBe(600);
  });

  it('walks upcoming → open → closed → waiting → drawable → drawing → drawn', () => {
    const cfg = ROUND_SCHEDULE[1];
    const p = createRoundProgress();
    expect(roundStatus(cfg, 4000, p)).toBe('upcoming');
    expect(roundStatus(cfg, 3900, p)).toBe('open');
    expect(roundStatus(cfg, 3301, p)).toBe('open');
    expect(roundStatus(cfg, 3300, p)).toBe('closed');
    expect(roundStatus(cfg, 3000, { ...p, confirmedClosed: true })).toBe('waiting');
    expect(roundStatus(cfg, 2700, p)).toBe('drawable');
    expect(roundStatus(cfg, 2000, { ...p, individual: { '3': 'x' } })).toBe('drawing');
    expect(roundStatus(cfg, 2000, { ...p, completed: true })).toBe('drawn');
  });
});
