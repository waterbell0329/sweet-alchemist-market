import { GAME_DURATION_SEC, PHASE_AT, ROUND_SCHEDULE } from '../data/gameConfig';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { SCHEDULE } from '../data/events';
import { nextUpcomingEvent } from '../engine/eventScheduler';
import { formatSec } from '../engine/timerEngine';
import { nextEventBi } from '../utils/eventText';
import { Bi } from './ui';

const pct = (remaining: number) => ((GAME_DURATION_SEC - remaining) / GAME_DURATION_SEC) * 100;

const SEGMENTS = [
  { from: GAME_DURATION_SEC, to: PHASE_AT.market, color: '#6b4a2e' },
  { from: PHASE_AT.market, to: PHASE_AT.lastCall, color: '#2f6f55' },
  { from: PHASE_AT.lastCall, to: PHASE_AT.closed, color: '#9b2f45' },
  { from: PHASE_AT.closed, to: 0, color: '#8a6d1a' },
];

export function TimelineBar() {
  const sec = useGame((s) => s.sec);
  const { t } = useT();
  const next = nextUpcomingEvent(SCHEDULE, sec);
  const done = pct(sec);

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex h-[30px] items-center justify-between gap-3">
        {next ? (
          <>
            <Bi text={nextEventBi(next)} size="sm" px={[19, 13]} inline className="min-w-0 truncate text-cream" />
            <span className="flex-none border-2 border-black bg-gold px-2 py-[3px] font-pixel text-[15px] text-black">
              {formatSec(sec - next.remainingSeconds)}
            </span>
          </>
        ) : (
          <Bi k="noNextEvent" size="sm" className="text-cream/70" inline />
        )}
      </div>
      <div className="relative h-[64px]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(done)} aria-label={t('progress')}>
        {/* close markers (top) */}
        {ROUND_SCHEDULE.map((r) => (
          <span
            key={`c${r.round}`}
            className="absolute top-0 -translate-x-1/2 font-pixel text-[11px] text-gold"
            style={{ left: `${pct(r.close)}%` }}
            title={`${t('markerClose')} R${r.round} · ${formatSec(r.close)}`}
          >
            ▼{r.round}
          </span>
        ))}
        <div className="absolute inset-x-0 top-[18px] h-[26px] overflow-hidden border-[3px] border-black bg-black">
          {SEGMENTS.map((s) => (
            <span
              key={s.from}
              className="absolute inset-y-0"
              style={{ left: `${pct(s.from)}%`, width: `${pct(s.to) - pct(s.from)}%`, background: s.color, opacity: 0.45 }}
            />
          ))}
          <span className="absolute inset-y-0 left-0" style={{ width: `${done}%`, background: 'var(--accent)' }} />
          {ROUND_SCHEDULE.map((r) => (
            <span key={`l${r.round}`} className="absolute inset-y-0 w-[3px] bg-black" style={{ left: `${pct(r.close)}%` }} />
          ))}
          <span className="absolute inset-y-0 w-[3px] bg-black" style={{ left: `${pct(PHASE_AT.lastCall)}%` }} />
        </div>
        {/* draw markers (bottom) */}
        {ROUND_SCHEDULE.map((r) => (
          <span
            key={`d${r.round}`}
            className="absolute bottom-0 -translate-x-1/2 font-pixel text-[11px] text-mint"
            style={{ left: `${pct(r.draw)}%` }}
            title={`${t('markerDraw')} R${r.round} · ${formatSec(r.draw)}`}
          >
            ★{r.round}
          </span>
        ))}
      </div>
    </div>
  );
}
