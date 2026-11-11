import { PRICE_MODES, PRICE_MODE_ORDER, type PriceMode, type ShopItemId } from '../data/recipes';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { PriceInfo, Trend } from '../engine/marketEngine';
import type { TKey } from '../i18n';
import { Bi } from './ui';

const MODE_KEY: Record<PriceMode, TKey> = { sale: 'modeSale', normal: 'modeNormal', shortage: 'modeShortage' };

export function PriceTag({ info, trend, big = true }: { info: PriceInfo; trend: Trend; big?: boolean }) {
  const { t } = useT();
  const color = info.source === 'news' ? (trend === 'up' ? 'text-coral' : 'text-mint') : info.price > 2 && trend === 'up' ? 'text-coral' : info.price < 2 ? 'text-mint' : 'text-cream';
  return (
    <div className="flex items-center justify-end gap-2">
      {trend && (
        <span className={`font-pixel ${trend === 'up' ? 'text-coral' : 'text-mint'}`} style={{ fontSize: big ? 22 : 16 }} aria-label={t(trend === 'up' ? 'priceUp' : 'priceDown')}>
          {trend === 'up' ? '▲' : '▼'}
        </span>
      )}
      <span
        key={`${info.price}-${info.source}`}
        className={`font-pixel tabular leading-none ${color} ${trend === 'up' ? 'flash-up' : trend === 'down' ? 'flash-down' : ''} px-1`}
        style={{ fontSize: big ? 40 : 30, textShadow: '3px 3px 0 #000' }}
      >
        {info.price}
      </span>
    </div>
  );
}

export function MaterialPriceRow({ id, emoji, info, trend, mode }: { id: ShopItemId; emoji: string; info: PriceInfo; trend: Trend; mode: PriceMode }) {
  const presentation = useGame((s) => s.presentation);
  const locked = useGame((s) => s.locked);
  const closed = useGame((s) => s.sec <= 600);
  const setPriceMode = useGame((s) => s.setPriceMode);
  const toast = useGame((s) => s.toast);
  const { t } = useT();

  return (
    <div className="grid grid-cols-[80px_1fr_128px] items-center gap-x-3 border-b-[3px] border-black/60 px-3 py-[8px] last:border-b-0">
      <div className="slot h-[80px] w-[80px] text-[46px]" aria-hidden>
        {emoji}
      </div>
      <div className="flex min-w-0 flex-col gap-[7px]">
        <div className="flex items-center gap-2">
          <Bi k={`mat_${id}` as TKey} size="lg" px={[30, 16]} weight={700} inline />
        </div>
        {!presentation && (
          <div className="seg w-fit" role="group" aria-label={t(`mat_${id}` as TKey)}>
            {PRICE_MODE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                disabled={locked || closed}
                className="flex h-[38px] w-[82px] items-center justify-center gap-[6px] text-[13px] font-semibold"
                title={`${t(MODE_KEY[m])} · ${PRICE_MODES[m]}`}
                onClick={() => {
                  if (setPriceMode(id as never, m)) toast('toastPriceSet', { price: PRICE_MODES[m] }, 'success', { item: `mat_${id}` as TKey });
                }}
              >
                <span className="font-pixel text-[13px]">{PRICE_MODES[m]}</span>
                <span>{t(MODE_KEY[m])}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <PriceTag info={info} trend={trend} />
        {info.source === 'news' ? (
          <span className="border-2 border-black bg-gold px-[6px] text-[13px] font-semibold text-black">📰 {t('badgeNews')}</span>
        ) : mode !== 'normal' ? (
          <span className={`border-2 border-black px-[6px] text-[13px] font-semibold ${mode === 'sale' ? 'bg-mint text-black' : 'bg-coral text-cream'}`}>
            {t(MODE_KEY[mode])}
          </span>
        ) : (
          <span className="text-[13px] text-cream/60">{t('coins', { count: info.price })}</span>
        )}
      </div>
    </div>
  );
}
