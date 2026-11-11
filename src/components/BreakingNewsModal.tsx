import { useMemo } from 'react';
import { NEWS_BY_ID, type NewsDef } from '../data/events';
import { MATERIAL_EMOJI, type ShopItemId } from '../data/recipes';
import { effectivePrice, newsSecondsLeft } from '../engine/marketEngine';
import { formatSec } from '../engine/timerEngine';
import { useGame } from '../store/gameStore';
import type { BiText } from '../hooks/useT';
import { translate, type Lang, type TKey } from '../i18n';
import type { Notice } from '../store/types';
import { Bi } from './ui';

export const itemKey = (id: ShopItemId) => (id === 'bundle' || id === 'recipeGacha' ? `item_${id}` : `mat_${id}`) as TKey;
export const itemEmoji = (id: ShopItemId) => (id === 'bundle' ? '🎁' : id === 'recipeGacha' ? '📜' : MATERIAL_EMOJI[id]);

export function durationText(def: NewsDef): BiText {
  const f = (lang: Lang) => {
    const d = def.duration;
    if (d.type === 'fixed') return translate(lang, 'dur_fixed', { min: d.seconds / 60 });
    if (d.type === 'untilEnd') return translate(lang, 'dur_untilEnd');
    return translate(lang, 'dur_untilRemaining', { time: formatSec(d.remainingSec) });
  };
  return { id: f('id'), ko: f('ko') };
}

/** Price changes and remaining time of one news item (body of the big news card). */
export function NewsChanges({ notice }: { notice: Notice }) {
  const active = useGame((s) => s.activeNews);
  const manual = useGame((s) => s.manualPrices);
  const sec = useGame((s) => s.sec);
  const def = NEWS_BY_ID[notice.newsId!];
  const entry = active.find((a) => a.uid === notice.activeUid);
  const changes = useMemo(() => {
    const without = active.filter((a) => a.uid !== notice.activeUid);
    return def.effects.flatMap((e) => e.items.map((item) => ({ item, from: effectivePrice(item, manual, without).price, to: e.price })));
  }, [active, manual, def, notice.activeUid]);
  const left = entry ? newsSecondsLeft(entry, sec) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3">
        {changes.map((c) => {
          const up = c.to > c.from;
          return (
            <div key={c.item} className="flex items-center gap-3 border-4 border-black bg-choco px-4 py-2" style={{ boxShadow: '4px 4px 0 #000' }}>
              <span className="text-[40px]" aria-hidden>
                {itemEmoji(c.item)}
              </span>
              <Bi k={itemKey(c.item)} size="lg" px={[28, 15]} weight={700} />
              <span className="font-pixel text-[28px] text-cream/60 line-through">{c.from}</span>
              <span className="font-pixel text-[22px]">→</span>
              <span className={`font-pixel text-[44px] ${up ? 'text-coral' : 'text-mint'}`} style={{ textShadow: '3px 3px 0 #000' }}>
                {c.to}
              </span>
              <span className={`font-pixel text-[22px] ${up ? 'text-coral' : 'text-mint'}`}>{up ? '▲' : '▼'}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <Bi text={durationText(def)} size="md" px={[24, 15]} weight={600} inline className="text-cream/90" />
        <span className="border-[3px] border-black bg-gold px-3 py-1 font-pixel text-[24px] text-black">{left === null ? '∞' : formatSec(left)}</span>
      </div>
    </div>
  );
}
