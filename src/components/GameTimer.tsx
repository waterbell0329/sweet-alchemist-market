import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { PHASE_AT, nextPhaseTargetSec, phaseFromRemainingSec } from '../data/gameConfig';
import { formatSec } from '../engine/timerEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { Bi, Btn } from './ui';
import type { TKey } from '../i18n';
import { useTeacherActions } from '../hooks/useTeacherActions';

export function GameTimer() {
  const sec = useGame((s) => s.sec);
  const running = useGame((s) => s.timer.running);
  const started = useGame((s) => s.started);
  const presentation = useGame((s) => s.presentation);
  const locked = useGame((s) => s.locked);
  const toggleRun = useGame((s) => s.toggleRun);
  const adjust = useGame((s) => s.adjust);
  const { t } = useT();
  const actions = useTeacherActions();
  const phase = phaseFromRemainingSec(sec);
  const lastCall = phase === 3;
  const over = sec === 0;
  const statusKey: TKey = over ? 'statusOver' : running ? 'statusRunning' : started ? 'statusPaused' : 'statusReady';
  const digitColor = over ? 'text-silver' : lastCall ? 'text-coral' : sec <= 60 ? 'text-coral' : running ? 'text-gold' : 'text-gold/60';

  return (
    <div className="flex h-full items-stretch justify-center gap-4">
      <div className="lcd flex w-[520px] flex-col items-center justify-center px-4 py-2" aria-live="off">
        <div className="flex w-full items-center justify-between gap-3">
          <Bi k={`phase${phase}` as TKey} size="sm" px={[19, 13]} className="text-gold" inline weight={600} />
          <span
            className={`flex-none border-2 border-black px-2 py-[2px] text-[14px] font-semibold ${
              running ? 'bg-mint text-black' : over ? 'bg-silver text-black' : 'bg-coral text-cream'
            }`}
          >
            {t(statusKey)}
          </span>
        </div>
        <div
          className={`font-pixel tabular leading-none ${digitColor}`}
          style={{ fontSize: 96, marginTop: 10, textShadow: '6px 6px 0 #000' }}
          role="timer"
          aria-label={`${formatSec(sec)}`}
        >
          {formatSec(sec)}
        </div>
        <div className="mt-2 h-[22px]">
          {lastCall && <Bi k="shopTimeLeft" p={{ time: formatSec(sec - PHASE_AT.closed) }} size="xs" px={[18, 13]} className="text-coral" inline />}
        </div>
      </div>

      {!presentation && (
        <div className="grid w-[248px] grid-cols-3 grid-rows-[78px_62px] gap-[10px]">
          <Btn
            tone={running ? 'coral' : 'mint'}
            className="col-span-2 flex-col !gap-0 text-[22px]"
            onClick={toggleRun}
            disabled={over}
            aria-keyshortcuts="Space"
            title={`${t(running ? 'pause' : started ? 'resume' : 'start')} (Space)`}
          >
            <span className="flex items-center gap-2">
              {running ? <Pause size={26} strokeWidth={3} /> : <Play size={26} strokeWidth={3} />}
              <Bi k={running ? 'pause' : started ? 'resume' : 'start'} size="md" px={[22, 12]} weight={700} />
            </span>
          </Btn>
          <Btn
            tone="gold"
            className="flex-col !gap-1 px-1 text-[12px]"
            onClick={actions.nextPhase}
            disabled={locked || nextPhaseTargetSec(sec) === null}
            aria-keyshortcuts="N"
            title={`${t('nextPhase')} (N)`}
          >
            <SkipForward size={24} strokeWidth={3} />
            <span className="text-center text-[12px] leading-tight">{t('nextPhase')}</span>
          </Btn>
          <Btn tone="choco" className="text-[18px]" onClick={() => adjust(-60)} disabled={locked} title={`${t('minus1')} · ${t('timeAdjustHint')} (−)`} aria-keyshortcuts="-">
            <span className="font-pixel text-[13px]">−1:00</span>
          </Btn>
          <Btn tone="choco" className="text-[18px]" onClick={() => adjust(60)} disabled={locked} title={`${t('plus1')} · ${t('timeAdjustHint')} (+)`} aria-keyshortcuts="+">
            <span className="font-pixel text-[13px]">+1:00</span>
          </Btn>
          <Btn tone="dark" className="flex-col !gap-0 text-[12px]" onClick={actions.reset} disabled={locked} title={t('reset')}>
            <RotateCcw size={22} strokeWidth={3} className="text-coral" />
            <span>{t('reset')}</span>
          </Btn>
        </div>
      )}
    </div>
  );
}
