import { useMemo } from 'react';
import { Store } from 'lucide-react';
import { MATERIALS, SPECIAL_ITEMS } from '../data/recipes';
import { allPrices } from '../engine/marketEngine';
import { useGame } from '../store/gameStore';
import type { TKey } from '../i18n';
import { MaterialPriceRow, PriceTag } from './MaterialPriceRow';
import { Bi, Coin, PanelTitle } from './ui';

export function MarketPanel() {
  const manual = useGame((s) => s.manualPrices);
  const active = useGame((s) => s.activeNews);
  const trends = useGame((s) => s.trends);
  const closed = useGame((s) => s.sec <= 600);
  const prices = useMemo(() => allPrices(manual, active), [manual, active]);

  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="shop">
      <PanelTitle
        k="shopTitle"
        icon={<Store size={26} className="text-gold" strokeWidth={2.5} />}
        right={
          <span className="flex items-center gap-1">
            <Coin kind="silver" size={28} />
            <span className="font-pixel text-[13px]">=1</span>
            <Coin kind="gold" size={28} />
            <span className="font-pixel text-[13px]">=5</span>
          </span>
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="grid flex-1 auto-rows-fr grid-cols-2 [&>*:nth-child(odd)]:border-r-[3px] [&>*]:border-black/60">
          {MATERIALS.map((m) => (
            <MaterialPriceRow key={m.id} id={m.id} emoji={m.emoji} info={prices[m.id]} trend={trends[m.id] ?? null} mode={manual[m.id]} />
          ))}
          <div className="grid grid-cols-2 content-center gap-3 bg-choco p-3">
          {SPECIAL_ITEMS.map((it) => (
            <div key={it.id} className="flex items-center gap-2 border-[3px] border-black bg-choco-3 p-2">
              <div className="slot slot-dark h-[52px] w-[52px] flex-none text-[28px]" aria-hidden>
                {it.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <Bi k={`item_${it.id}` as TKey} size="sm" px={[18, 12]} weight={700} className="leading-tight" />
              </div>
              <PriceTag info={prices[it.id]} trend={trends[it.id] ?? null} big={false} />
            </div>
          ))}
          </div>
        </div>
        {closed && <ClosedStamp k="shopClosed" />}
      </div>
    </section>
  );
}

export function ClosedStamp({ k }: { k: TKey }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(26, 18, 11, 0.82)' }}>
      <div className="stamp bg-choco text-coral" style={{ boxShadow: '8px 8px 0 #000' }}>
        <Bi k={k} size="xl" px={[26, 16]} pixel className="items-center text-center" />
      </div>
    </div>
  );
}
