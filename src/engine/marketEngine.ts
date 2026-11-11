import { NEWS_BY_ID, type NewsDef, type NewsId } from '../data/events';
import { BASE_PRICES, MATERIAL_IDS, PRICE_MODES, SHOP_ITEM_IDS, type MaterialId, type PriceMode, type ShopItemId } from '../data/recipes';

export interface ActiveNews {
  uid: string;
  newsId: NewsId;
  /** Activation order; the highest seq wins when two news touch the same item. */
  seq: number;
  /** Remaining-second when activated (game time). */
  activatedAtSec: number;
  /** Expires when remaining time reaches this second; null = until game end / cancel. */
  expiresAtSec: number | null;
}

export type ManualPrices = Record<MaterialId, PriceMode>;

export const defaultManualPrices = (): ManualPrices =>
  Object.fromEntries(MATERIAL_IDS.map((id) => [id, 'normal'])) as ManualPrices;

export interface PriceInfo {
  price: number;
  source: 'news' | 'manual' | 'base';
  newsId?: NewsId;
}

/** Priority: active news (latest wins) → teacher manual setting → base price. */
export function effectivePrice(item: ShopItemId, manual: ManualPrices, active: readonly ActiveNews[]): PriceInfo {
  let winner: { seq: number; price: number; newsId: NewsId } | null = null;
  for (const a of active) {
    const def = NEWS_BY_ID[a.newsId];
    for (const eff of def.effects) {
      if (eff.items.includes(item) && (!winner || a.seq > winner.seq)) winner = { seq: a.seq, price: eff.price, newsId: a.newsId };
    }
  }
  if (winner) return { price: winner.price, source: 'news', newsId: winner.newsId };
  if ((MATERIAL_IDS as string[]).includes(item)) {
    const mode = manual[item as MaterialId];
    return { price: PRICE_MODES[mode], source: mode === 'normal' ? 'base' : 'manual' };
  }
  return { price: BASE_PRICES[item], source: 'base' };
}

export function allPrices(manual: ManualPrices, active: readonly ActiveNews[]): Record<ShopItemId, PriceInfo> {
  return Object.fromEntries(SHOP_ITEM_IDS.map((id) => [id, effectivePrice(id, manual, active)])) as Record<ShopItemId, PriceInfo>;
}

/** Expiry second for a news activated at `sec`, or undefined if it cannot be activated now. */
export function computeExpiry(def: NewsDef, sec: number): number | null | undefined {
  switch (def.duration.type) {
    case 'fixed':
      return Math.max(0, sec - def.duration.seconds);
    case 'untilEnd':
      return null;
    case 'untilRemaining':
      return sec > def.duration.remainingSec ? def.duration.remainingSec : undefined;
  }
}

/** Activate (or re-activate, replacing the previous instance of the same news). */
export function activateNews(
  active: readonly ActiveNews[],
  newsId: NewsId,
  sec: number,
  seq: number,
  uid: string,
): { active: ActiveNews[]; entry: ActiveNews } | null {
  const expiresAtSec = computeExpiry(NEWS_BY_ID[newsId], sec);
  if (expiresAtSec === undefined) return null;
  const entry: ActiveNews = { uid, newsId, seq, activatedAtSec: sec, expiresAtSec };
  return { active: [...active.filter((a) => a.newsId !== newsId), entry], entry };
}

export function expireNews(active: readonly ActiveNews[], sec: number): { active: ActiveNews[]; expired: ActiveNews[] } {
  const keep: ActiveNews[] = [];
  const expired: ActiveNews[] = [];
  for (const a of active) (a.expiresAtSec !== null && sec <= a.expiresAtSec ? expired : keep).push(a);
  return { active: keep, expired };
}

/** Remaining validity in seconds (null = open-ended). */
export const newsSecondsLeft = (a: ActiveNews, sec: number): number | null =>
  a.expiresAtSec === null ? null : Math.max(0, sec - a.expiresAtSec);

export type Trend = 'up' | 'down' | null;

/** Compares current prices with the last remembered ones and records direction of change. */
export function computeTrends(
  memory: Partial<Record<ShopItemId, number>>,
  trends: Partial<Record<ShopItemId, Trend>>,
  prices: Record<ShopItemId, PriceInfo>,
): { memory: Record<ShopItemId, number>; trends: Record<ShopItemId, Trend>; changed: boolean } {
  let changed = false;
  const nextMem = {} as Record<ShopItemId, number>;
  const nextTrends = {} as Record<ShopItemId, Trend>;
  for (const id of SHOP_ITEM_IDS) {
    const prev = memory[id];
    const now = prices[id].price;
    nextMem[id] = now;
    if (prev === undefined || prev === now) nextTrends[id] = trends[id] ?? null;
    else {
      nextTrends[id] = now > prev ? 'up' : 'down';
      changed = true;
    }
    if (prev === undefined) changed = true;
  }
  return { memory: nextMem, trends: nextTrends, changed };
}
