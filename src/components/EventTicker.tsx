import { NEWS_BY_ID } from '../data/events';
import { newsSecondsLeft } from '../engine/marketEngine';
import { formatSec } from '../engine/timerEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { logBi, newsTitleKey } from '../utils/eventText';
import { itemEmoji } from './BreakingNewsModal';
import { Bi } from './ui';

export function EventTicker() {
  const active = useGame((s) => s.activeNews);
  const sec = useGame((s) => s.sec);
  const log = useGame((s) => s.log);
  const draws = useGame((s) => s.draws);
  const { t } = useT();
  const recent = log
    .slice(-6)
    .reverse()
    .map((e) => ({ e, text: logBi(e, draws) }))
    .filter((x) => x.text)
    .slice(0, 3);

  return (
    <footer className="absolute bottom-3 left-4 right-4 flex h-[68px] items-stretch border-4 border-black bg-choco" style={{ boxShadow: '6px 6px 0 #000' }}>
      <div className="flex flex-none items-center gap-2 bg-coral px-4 font-pixel text-[16px] text-cream">
        <span className="h-[12px] w-[12px] bg-cream" aria-hidden /> LIVE
      </div>
      <div className="flex min-w-0 flex-[1.15] items-center gap-3 border-r-4 border-black px-3" aria-label={t('tickerNews')}>
        {active.length === 0 ? (
          <Bi k="toastNoNews" size="sm" px={[18, 13]} inline className="text-cream/60" weight={500} />
        ) : (
          active.map((a) => {
            const def = NEWS_BY_ID[a.newsId];
            const left = newsSecondsLeft(a, sec);
            const items = def.effects.flatMap((e) => e.items);
            return (
              <div key={a.uid} className="flex min-w-0 items-center gap-2 border-[3px] border-black bg-choco-3 px-2 py-1">
                <span className="text-[24px]" aria-hidden>
                  {def.emoji}
                </span>
                <Bi k={newsTitleKey(a.newsId)} size="xs" px={[16, 12]} weight={700} className={`truncate ${def.tone === 'danger' ? 'text-coral' : 'text-gold'}`} />
                <span className="flex-none text-[18px]" aria-hidden>
                  {items.length > 2 ? '🛒' : items.map(itemEmoji).join('')}
                </span>
                <span className="flex-none font-pixel text-[14px]">→{def.effects[0].price}</span>
                <span className="flex-none border-2 border-black bg-gold px-1 font-pixel text-[12px] text-black">{left === null ? '∞' : formatSec(left)}</span>
              </div>
            );
          })
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden px-4" aria-label={t('tickerLog')}>
        {recent.length === 0 ? (
          <Bi k="tickerEmpty" size="sm" px={[18, 13]} inline className="text-cream/60" weight={500} />
        ) : (
          recent.map(({ e, text }, i) => (
            <span key={e.uid} className={`flex min-w-0 items-center gap-2 ${i === 0 ? 'flex-none' : 'truncate opacity-70'}`}>
              <span className="font-pixel text-[12px] text-gold">{formatSec(e.atSec)}</span>
              <Bi text={text!} size="xs" px={[16, 12]} weight={600} inline className="truncate" />
            </span>
          ))
        )}
      </div>
    </footer>
  );
}
