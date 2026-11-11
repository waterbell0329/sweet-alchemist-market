import { FlaskConical, Landmark, Minus, Plus, Store } from 'lucide-react';
import { LAYOUT, ROUND_SCHEDULE, UI_SCALES } from '../data/gameConfig';
import { canDraw, roundStatus } from '../engine/investmentEngine';
import { useGame, type Screen } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n';
import { Bi } from './ui';

const TABS: { id: Screen; k: TKey; icon: typeof Store; key: string }[] = [
  { id: 'market', k: 'tabMarket', icon: Store, key: '1' },
  { id: 'craft', k: 'tabCraft', icon: FlaskConical, key: '2' },
  { id: 'invest', k: 'tabInvest', icon: Landmark, key: '3' },
];

/** Left menu: one button per screen, plus the content-size control for far-away seats. */
export function SideNav() {
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const sec = useGame((s) => s.sec);
  const rounds = useGame((s) => s.rounds);
  const uiScale = useGame((s) => s.uiScale);
  const stepScale = useGame((s) => s.stepScale);
  const { t } = useT();
  // Nudge the teacher toward the bank when a draw is waiting.
  const drawReady = ROUND_SCHEDULE.some((c, i) => canDraw(roundStatus(c, sec, rounds[i])));
  const i = UI_SCALES.indexOf(uiScale);

  return (
    <nav
      className="absolute left-4 flex flex-col gap-3"
      style={{ top: LAYOUT.top, bottom: LAYOUT.bottom, width: LAYOUT.navW }}
      aria-label="screens"
    >
      <div className="flex flex-1 flex-col gap-3" role="tablist" aria-orientation="vertical">
        {TABS.map(({ id, k, icon: Icon, key }) => {
          const on = screen === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-keyshortcuts={key}
              onClick={() => setScreen(id)}
              className={`btn focus-ring relative flex-1 flex-col !gap-2 px-1 ${on ? 'btn-gold' : 'btn-choco'} ${id === 'invest' && drawReady && !on ? 'ping-ring' : ''}`}
            >
              <Icon size={48} strokeWidth={2.4} />
              <Bi k={k} size="md" px={[24, 15]} weight={700} className="items-center text-center leading-tight" />
              <span className="absolute right-[6px] top-[4px] font-pixel text-[11px] opacity-60">{key}</span>
            </button>
          );
        })}
      </div>
      <div className="panel flex flex-none flex-col items-center gap-2 p-2" role="group" aria-label={t('zoomLabel')}>
        <span className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-cream/70">{t('zoomLabel')}</span>
          <span className="font-pixel text-[15px] text-gold">{Math.round(uiScale * 100)}%</span>
        </span>
        <div className="flex w-full gap-2">
          <button
            type="button"
            className="btn btn-choco focus-ring h-[56px] flex-1"
            onClick={() => stepScale(-1)}
            disabled={i <= 0}
            aria-label={t('zoomOut')}
            title={`${t('zoomOut')} ( [ )`}
          >
            <Minus size={26} strokeWidth={3} />
          </button>
          <button
            type="button"
            className="btn btn-gold focus-ring h-[56px] flex-1"
            onClick={() => stepScale(1)}
            disabled={i >= UI_SCALES.length - 1}
            aria-label={t('zoomIn')}
            title={`${t('zoomIn')} ( ] )`}
          >
            <Plus size={26} strokeWidth={3} />
          </button>
        </div>
      </div>
    </nav>
  );
}
