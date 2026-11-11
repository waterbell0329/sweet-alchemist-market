import { X } from 'lucide-react';
import { NEWS } from '../data/events';
import { newsSecondsLeft } from '../engine/marketEngine';
import { formatSec } from '../engine/timerEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { newsTitleKey } from '../utils/eventText';
import { durationText, itemEmoji, itemKey } from './BreakingNewsModal';
import { Bi, Btn } from './ui';

export function NewsMenu() {
  const open = useGame((s) => s.newsMenuOpen);
  const setOpen = useGame((s) => s.setNewsMenu);
  const active = useGame((s) => s.activeNews);
  const sec = useGame((s) => s.sec);
  const trigger = useGame((s) => s.triggerNews);
  const cancel = useGame((s) => s.cancelNews);
  const { t } = useT();
  if (!open) return null;
  const closed = sec <= 600;

  return (
    <div className="panel slide-down absolute right-4 top-[196px] z-[28] w-[760px]" role="dialog" aria-label={t('newsMenuTitle')}>
      <div className="panel-title">
        <span className="gem" aria-hidden />
        <Bi k="newsMenuTitle" size="lg" px={[24, 14]} weight={700} inline className="flex-1 text-gold" />
        <button type="button" className="btn btn-dark focus-ring h-[44px] w-[44px]" onClick={() => setOpen(false)} aria-label={t('close')}>
          <X size={24} />
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {NEWS.map((n) => {
          const a = active.find((x) => x.newsId === n.id);
          const left = a ? newsSecondsLeft(a, sec) : null;
          const items = n.effects.flatMap((e) => e.items.map((i) => ({ i, p: e.price })));
          return (
            <div key={n.id} className={`flex items-center gap-4 border-[3px] border-black p-3 ${a ? 'bg-choco-4' : 'bg-choco'}`}>
              <div className="slot slot-dark h-[64px] w-[64px] flex-none text-[36px]" aria-hidden>
                {n.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <Bi k={newsTitleKey(n.id)} size="md" px={[21, 13]} weight={700} className={n.tone === 'danger' ? 'text-coral' : 'text-gold'} />
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                  <span className="flex items-center gap-1">
                    {items.map(({ i }) => (
                      <span key={i} aria-hidden>
                        {itemEmoji(i)}
                      </span>
                    ))}
                    <span className="font-pixel text-[13px]">→{items[0].p}</span>
                    <span className="sr-only">{items.map(({ i }) => t(itemKey(i))).join(', ')}</span>
                  </span>
                  <Bi text={durationText(n)} size="xs" px={[14, 12]} inline className="text-cream/75" weight={500} />
                </div>
                <span className="mt-1 block text-[13px] text-cream/60">
                  {n.autoAt !== null ? t('autoAt', { time: formatSec(n.autoAt) }) : t('manualOnly')}
                </span>
              </div>
              {a ? (
                <div className="flex flex-none flex-col items-end gap-2">
                  <span className="flex items-center gap-2 border-2 border-black bg-mint px-2 py-[2px] text-[14px] font-bold text-black">
                    {t('activeNow')} · <span className="font-pixel text-[12px]">{left === null ? '∞' : formatSec(left)}</span>
                  </span>
                  <div className="flex gap-2">
                    <Btn tone="choco" className="h-[44px] px-3 text-[15px]" disabled={closed} onClick={() => trigger(n.id)}>
                      {t('reactivate')}
                    </Btn>
                    <Btn tone="coral" className="h-[44px] px-3 text-[15px]" onClick={() => cancel(a.uid)}>
                      {t('cancelNews')}
                    </Btn>
                  </div>
                </div>
              ) : (
                <Btn
                  tone="gold"
                  className="h-[56px] min-w-[132px] flex-none px-4 text-[19px]"
                  disabled={closed}
                  onClick={() => {
                    if (trigger(n.id)) setOpen(false);
                  }}
                >
                  {t('activate')}
                </Btn>
              )}
            </div>
          );
        })}
        {closed && <Bi k="newsUnavailable" size="sm" className="text-coral" inline />}
      </div>
    </div>
  );
}
