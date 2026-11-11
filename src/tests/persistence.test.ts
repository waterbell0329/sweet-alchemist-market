import { describe, expect, it } from 'vitest';
import { defaultGame, sanitize } from '../store/persistence';

describe('persistence validation', () => {
  it('round-trips a default game', () => {
    const g = defaultGame();
    expect(sanitize(JSON.parse(JSON.stringify(g)))).toEqual(g);
  });

  it('replaces corrupt fields with defaults instead of crashing', () => {
    const g = sanitize({
      schema: 1,
      lang: 'fr',
      grade: 5,
      timer: { running: 'yes' },
      rounds: [{ mode: 'weird', individual: { abc: 1, '3': 'x' } }],
      draws: [{ uid: 'bad' }],
      manualPrices: { susu: 'free', kakao: 'sale' },
      awards: { master: 42 },
      tutorial: { open: true, slide: 99 },
      uiScale: 7,
    });
    expect(g.uiScale).toBe(1);
    expect(sanitize({ schema: 1, uiScale: 1.3 }).uiScale).toBe(1.3);
    expect(sanitize({ schema: 1, tutorial: { open: true, slide: 9 } }).tutorial.slide).toBe(9);
    expect(sanitize({ schema: 1, tutorial: { open: true, slide: 10 } }).tutorial.slide).toBe(0);
    expect(g.lang).toBe('both');
    expect(g.grade).toBe(4);
    expect(g.timer.anchorRemainingMs).toBe(4_500_000);
    expect(g.rounds).toHaveLength(5);
    expect(g.rounds[0]).toMatchObject({ mode: 'index', individual: { '3': 'x' } });
    expect(g.draws).toEqual([]);
    expect(g.manualPrices.susu).toBe('normal');
    expect(g.manualPrices.kakao).toBe('sale');
    expect(g.awards.master).toBe('');
    expect(g.tutorial).toEqual({ open: true, slide: 0 });
  });

  it('rejects saves from another schema', () => {
    expect(() => sanitize({ schema: 99 })).toThrow();
    expect(() => sanitize(null)).toThrow();
  });
});
