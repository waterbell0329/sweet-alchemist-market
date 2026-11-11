import { describe, expect, it } from 'vitest';
import { RECIPE_RULES, recipesForGrade, tier2Need } from '../engine/craftingRules';
import { GRADES } from '../data/gameConfig';

describe('crafting rules', () => {
  it('tier 2 needs 2 mini snacks in grade 4 and 3 in grade 6', () => {
    expect(tier2Need(4)).toBe(2);
    expect(tier2Need(6)).toBe(3);
    for (const g of [4, 6] as const) {
      const r = recipesForGrade(g);
      const bar = r.find((x) => x.id === 'bigChocoBar')!;
      const box = r.find((x) => x.id === 'cookieBox')!;
      expect(bar.ingredients).toEqual([{ kind: 'dessert', id: 'milkChoco', qty: g === 4 ? 2 : 3 }, { kind: 'material', id: 'susu', qty: 1 }]);
      expect(box.ingredients).toEqual([{ kind: 'dessert', id: 'butterCookie', qty: g === 4 ? 2 : 3 }, { kind: 'material', id: 'kakao', qty: 2 }]);
    }
  });

  it('tier 3 needs both tier 2 desserts, 2 cheese and the legendary recipe', () => {
    const cake = recipesForGrade(4).find((x) => x.tier === 3)!;
    expect(cake.recipeCard).toBe('legendary');
    expect(cake.ingredients).toEqual([
      { kind: 'dessert', id: 'bigChocoBar', qty: 1 },
      { kind: 'dessert', id: 'cookieBox', qty: 1 },
      { kind: 'material', id: 'keju', qty: 2 },
    ]);
  });

  it('recipes are unlimited and not consumed', () => {
    expect(RECIPE_RULES.unlimitedUse).toBe(true);
    expect(RECIPE_RULES.consumedOnUse).toBe(false);
  });

  it('starter pack split is integral and adds up', () => {
    expect(GRADES[4].rich + GRADES[4].technician).toBe(22);
    expect(GRADES[6].rich + GRADES[6].technician).toBe(30);
  });
});
