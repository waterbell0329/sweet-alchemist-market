import { ROUND_SCHEDULE } from '../data/gameConfig';
import { roundStatus, type RoundStatus } from '../engine/investmentEngine';
import { formatSec } from '../engine/timerEngine';
import { useGame, activeGachaRound } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n';

const STATUS_STYLE: Record<RoundStatus, { bg: string; fg: string; icon: string }> = {
  upcoming: { bg: '#2C1E14', fg: 'rgba(255,253,249,0.55)', icon: '·' },
  open: { bg: '#10B981', fg: '#000', icon: '●' },
  closed: { bg: '#F43F5E', fg: '#FFFDF9', icon: '■' },
  waiting: { bg: '#E8954A', fg: '#000', icon: '⏳' },
  drawable: { bg: '#FFD700', fg: '#000', icon: '★' },
  drawing: { bg: '#FFD700', fg: '#000', icon: '★' },
  drawn: { bg: '#E2E8F0', fg: '#000', icon: '✓' },
};

export function RoundTracker() {
  const sec = useGame((s) => s.sec);
  const rounds = useGame((s) => s.rounds);
  const selected = useGame((s) => s.selectedRound);
  const selectRound = useGame((s) => s.selectRound);
  const { t } = useT();
  const current = activeGachaRound({ sec, rounds, selectedRound: selected });

  return (
    <div className="grid grid-cols-5 gap-[8px]" role="tablist" aria-label="rounds">
      {ROUND_SCHEDULE.map((cfg, i) => {
        const st = roundStatus(cfg, sec, rounds[i]);
        const style = STATUS_STYLE[st];
        const isCurrent = current === cfg.round;
        return (
          <button
            key={cfg.round}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            onClick={() => selectRound(selected === cfg.round ? null : cfg.round)}
            className={`focus-ring relative flex h-[82px] flex-col items-center justify-center border-[3px] border-black px-1 ${st === 'drawable' ? 'ping-ring' : ''}`}
            style={{
              background: style.bg,
              color: style.fg,
              boxShadow: isCurrent ? '0 0 0 3px #FFD700, 4px 4px 0 3px #000' : '3px 3px 0 #000',
              transform: isCurrent ? 'translateY(-2px)' : undefined,
            }}
            title={`${t('roundN', { round: cfg.round })} · ${t(`st_${st}` as TKey)}`}
          >
            <span className="flex items-center gap-[6px] font-pixel text-[16px]">
              <span aria-hidden>{style.icon}</span>R{cfg.round}
            </span>
            <span className="mt-[4px] text-center text-[14px] font-bold leading-[1.05]">{t(`st_${st}` as TKey)}</span>
            <span className="mt-[3px] whitespace-nowrap font-pixel text-[9px] opacity-80">
              {formatSec(cfg.close)}▸{formatSec(cfg.draw)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
