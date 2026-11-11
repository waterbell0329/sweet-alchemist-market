import { describe, expect, it } from 'vitest';
import { activateNews, allPrices, computeTrends, defaultManualPrices, effectivePrice, expireNews, newsSecondsLeft } from '../engine/marketEngine';
import { MATERIAL_IDS } from '../data/recipes';

describe('market prices', () => {
  it('all materials default to 2 coins, bundle 5, recipe gacha 3', () => {
    const p = allPrices(defaultManualPrices(), []);
    for (const m of MATERIAL_IDS) expect(p[m].price).toBe(2);
    expect(p.bundle.price).toBe(5);
    expect(p.recipeGacha.price).toBe(3);
  });

  it('sale / normal / shortage set 1 / 2 / 4', () => {
    const manual = { ...defaultManualPrices(), susu: 'sale' as const, gula: 'shortage' as const };
    expect(effectivePrice('susu', manual, []).price).toBe(1);
    expect(effectivePrice('gula', manual, []).price).toBe(4);
    expect(effectivePrice('kakao', manual, []).price).toBe(2);
  });

  it('active news overrides the manual price and restores it when gone', () => {
    const manual = { ...defaultManualPrices(), kakao: 'shortage' as const };
    const on = activateNews([], 'cocoaHarvest', 2400, 1, 'a1')!;
    expect(effectivePrice('kakao', manual, on.active)).toMatchObject({ price: 1, source: 'news' });
    const off = expireNews(on.active, 2100);
    expect(off.expired).toHaveLength(1);
    expect(effectivePrice('kakao', manual, off.active)).toMatchObject({ price: 4, source: 'manual' });
  });

  it('cocoa harvest lasts 5 game minutes', () => {
    const { entry, active } = activateNews([], 'cocoaHarvest', 2400, 1, 'a')!;
    expect(entry.expiresAtSec).toBe(2100);
    expect(expireNews(active, 2101).expired).toHaveLength(0);
    expect(expireNews(active, 2100).expired).toHaveLength(1);
    expect(newsSecondsLeft(entry, 2250)).toBe(150);
  });

  it('cheese shortage sets cheese to 4 until cancelled', () => {
    const { active, entry } = activateNews([], 'cheeseShortage', 1500, 1, 'c')!;
    expect(effectivePrice('keju', defaultManualPrices(), active).price).toBe(4);
    expect(entry.expiresAtSec).toBeNull();
    expect(expireNews(active, 0).expired).toHaveLength(0);
  });

  it('visiting alchemist lowers random recipe 3 → 2 for 3 minutes', () => {
    const { active, entry } = activateNews([], 'visitingAlchemist', 3000, 1, 'v')!;
    expect(effectivePrice('recipeGacha', defaultManualPrices(), active).price).toBe(2);
    expect(entry.expiresAtSec).toBe(2820);
  });

  it('final sale sets every material to 1 until 10:00 and cannot start after it', () => {
    const { active, entry } = activateNews([], 'finalSale', 800, 1, 'f')!;
    for (const m of MATERIAL_IDS) expect(effectivePrice(m, defaultManualPrices(), active).price).toBe(1);
    expect(entry.expiresAtSec).toBe(600);
    expect(activateNews([], 'finalSale', 600, 2, 'g')).toBeNull();
  });

  it('the most recently activated news wins on the same item', () => {
    let s = activateNews([], 'cheeseShortage', 1500, 1, 'c')!.active;
    s = activateNews(s, 'finalSale', 800, 2, 'f')!.active;
    expect(effectivePrice('keju', defaultManualPrices(), s).price).toBe(1);
    const after = expireNews(s, 600).active;
    expect(effectivePrice('keju', defaultManualPrices(), after).price).toBe(4);
  });

  it('re-activating a news replaces the previous instance', () => {
    let s = activateNews([], 'cocoaHarvest', 2400, 1, 'a')!.active;
    s = activateNews(s, 'cocoaHarvest', 2300, 2, 'b')!.active;
    expect(s).toHaveLength(1);
    expect(s[0].expiresAtSec).toBe(2000);
  });

  it('trend arrows compare with the previous price', () => {
    const p1 = allPrices(defaultManualPrices(), []);
    const t1 = computeTrends({}, {}, p1);
    expect(t1.trends.kakao).toBeNull();
    const p2 = allPrices(defaultManualPrices(), activateNews([], 'cocoaHarvest', 2400, 1, 'a')!.active);
    const t2 = computeTrends(t1.memory, t1.trends, p2);
    expect(t2.trends.kakao).toBe('down');
    const t3 = computeTrends(t2.memory, t2.trends, allPrices({ ...defaultManualPrices(), kakao: 'shortage' }, []));
    expect(t3.trends.kakao).toBe('up');
  });
});
