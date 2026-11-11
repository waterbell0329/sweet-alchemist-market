import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCw, Sparkles } from 'lucide-react';
import { GRADES, MAX_GOLD_PER_DRAW, ROUND_SCHEDULE } from '../data/gameConfig';
import { OUTCOMES, OUTCOME_BY_ID, formatPct, type Outcome } from '../data/investments';
import { canDraw, roundStatus } from '../engine/investmentEngine';
import { sound } from '../engine/soundEngine';
import { formatSec } from '../engine/timerEngine';
import { activeGachaRound, getAppStore, useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { TKey } from '../i18n';
import { Bi, Btn, Stepper } from './ui';

const SPIN_MS = 2500;

const toneColor = (o: Outcome) => (o.tone === 'danger' ? '#F43F5E' : o.tone === 'success' ? '#10B981' : '#FFD700');

function Reel({ outcome, moving }: { outcome: Outcome | null; moving: boolean }) {
  const { t } = useT();
  return (
    <div
      className="relative flex h-[156px] w-[220px] flex-none flex-col items-center justify-center overflow-hidden border-4 border-black"
      style={{ background: '#0a0704', boxShadow: 'inset 0 0 0 4px #523823, inset 0 18px 0 rgba(0,0,0,0.5), inset 0 -18px 0 rgba(0,0,0,0.5)' }}
      aria-live="polite"
    >
      <span className="absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[12px] border-l-[14px] border-y-transparent border-l-gold" aria-hidden />
      <span className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[12px] border-r-[14px] border-y-transparent border-r-gold" aria-hidden />
      {outcome ? (
        <div className={`flex flex-col items-center ${moving ? 'reel-moving' : 'pop-in'}`}>
          <span className="text-[48px] leading-none" aria-hidden>
            {outcome.emoji}
          </span>
          <span className="mt-2 font-pixel text-[36px] leading-none" style={{ color: toneColor(outcome), textShadow: '3px 3px 0 #000' }}>
            {formatPct(outcome.returnPct)}
          </span>
          {!moving && <span className="mt-1 text-[18px] font-bold text-cream">{t(`out_${outcome.id}` as TKey)}</span>}
        </div>
      ) : (
        <span className="font-pixel text-[64px] text-gold/70" style={{ textShadow: '4px 4px 0 #000' }}>
          ?
        </span>
      )}
    </div>
  );
}

export function GachaMachine() {
  const sec = useGame((s) => s.sec);
  const rounds = useGame((s) => s.rounds);
  const selectedRound = useGame((s) => s.selectedRound);
  const grade = useGame((s) => s.grade);
  const input = useGame((s) => s.gachaInput);
  const spinState = useGame((s) => s.spinState);
  const draws = useGame((s) => s.draws);
  const focus = useGame((s) => s.gachaFocus);
  const presentation = useGame((s) => s.presentation);
  const { t } = useT();
  const reduced = useReducedMotion();
  const round = activeGachaRound({ sec, rounds, selectedRound });
  const cfg = ROUND_SCHEDULE[round - 1];
  const rp = rounds[round - 1];
  const status = roundStatus(cfg, sec, rp);
  const drawable = canDraw(status);
  const individual = rp.mode === 'individual';
  const spinning = spinState.status === 'spinning';
  const [reelOutcome, setReelOutcome] = useState<Outcome | null>(null);
  const [flash, setFlash] = useState(false);
  const animatedFor = useRef<string | null>(null);

  // Last valid result of this round, shown in the reel while idle.
  const lastRecord = [...draws].reverse().find((d) => d.round === round && !d.voided);
  const idleOutcome = lastRecord ? OUTCOME_BY_ID[lastRecord.outcomeId] : null;

  useEffect(() => {
    if (!focus) return;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), 1500);
    return () => window.clearTimeout(id);
  }, [focus]);

  // Animation is purely cosmetic: the record was committed before it starts.
  useEffect(() => {
    if (!spinning || !spinState.recordId || animatedFor.current === spinState.recordId) return;
    const record = getAppStore().getState().draws.find((d) => d.uid === spinState.recordId);
    if (!record) return;
    animatedFor.current = spinState.recordId;
    const final = OUTCOME_BY_ID[record.outcomeId];
    const timers: number[] = [];
    sound.play('drumroll');
    if (reduced) {
      setReelOutcome(final);
      timers.push(window.setTimeout(() => getAppStore().getState().revealSpin(), 600));
    } else {
      let elapsed = 0;
      let idx = Math.floor(Math.random() * OUTCOMES.length); // cosmetic only
      let delay = 45;
      while (elapsed + delay < SPIN_MS - 260) {
        elapsed += delay;
        const show = OUTCOMES[idx++ % OUTCOMES.length];
        timers.push(window.setTimeout(() => setReelOutcome(show), elapsed));
        delay = Math.min(320, delay * 1.11);
      }
      timers.push(window.setTimeout(() => setReelOutcome(final), SPIN_MS - 200));
      timers.push(window.setTimeout(() => getAppStore().getState().revealSpin(), SPIN_MS));
    }
    return () => {
      timers.forEach((x) => window.clearTimeout(x));
      sound.stopDrumroll();
      // If the effect is torn down mid-spin, reveal immediately so the result is never lost.
      if (getAppStore().getState().spinState.status === 'spinning') getAppStore().getState().revealSpin();
    };
  }, [spinning, spinState.recordId, reduced]);

  useEffect(() => {
    if (!spinning) {
      sound.stopDrumroll();
      setReelOutcome(null);
    }
  }, [spinning]);

  const st = () => getAppStore().getState();

  const doSpin = (overwrite = false) => {
    const res = st().spin({ round, overwrite });
    if (res.ok) return;
    switch (res.reason) {
      case 'duplicate':
        st().askConfirm({
          titleKey: 'confirmRespin_title',
          bodyKey: 'confirmRespin_body',
          params: { student: input.student },
          keyParams: { result: `out_${res.existing?.outcomeId ?? 'interest'}` as TKey },
          confirmKey: 'confirmRespin_btn',
          danger: true,
          onConfirm: () => doSpin(true),
        });
        break;
      case 'student':
        st().toast(`err_student_${res.error}` as TKey, { max: GRADES[grade].students }, 'danger');
        break;
      case 'gold':
        st().toast(`err_gold_${res.error}` as TKey, { max: MAX_GOLD_PER_DRAW }, 'danger');
        break;
      case 'busy':
        st().toast('err_busy', undefined, 'danger');
        break;
      case 'locked':
        st().toast('err_locked', undefined, 'danger');
        break;
      case 'alreadyDrawn':
        if (res.existing) st().reviewRecord(res.existing.uid);
        break;
    }
  };

  const changeMode = (mode: 'index' | 'individual') => {
    const r = st().setRoundMode(round, mode);
    if (r === 'needsConfirm')
      st().askConfirm({ titleKey: 'confirmMode_title', bodyKey: 'confirmMode_body', danger: true, onConfirm: () => st().setRoundMode(round, mode, true) });
    else if (r === 'busy') st().toast('err_busy', undefined, 'danger');
  };

  // Expose SPIN to the keyboard shortcut handler.
  useEffect(() => {
    const handler = () => {
      if (drawable && !spinning && !(rp.mode === 'index' && rp.indexRecordId)) doSpin();
    };
    window.addEventListener('sam:spin', handler);
    return () => window.removeEventListener('sam:spin', handler);
  });

  const drawnCount = Object.keys(rp.individual).length;
  const indexDone = !individual && !!rp.indexRecordId;

  return (
    <div
      className={`relative border-4 border-black p-[12px] ${flash ? 'ping-ring' : ''}`}
      style={{ background: 'linear-gradient(180deg, #523823 0%, #3B2819 100%)', boxShadow: 'inset 0 0 0 3px #FFD700, 5px 5px 0 #000' }}
    >
      <div className="mb-[8px] flex items-center gap-3">
        <Sparkles size={24} className="text-gold" />
        <Bi k="gachaTitle" size="md" px={[22, 13]} weight={700} inline className="text-gold" />
        <span className="ml-auto border-[3px] border-black bg-gold px-2 py-[2px] font-pixel text-[14px] text-black">R{round}</span>
        <span className="text-[16px] font-bold text-cream">{t(`st_${status}` as TKey)}</span>
      </div>
      <div className="flex gap-[14px]">
        <Reel outcome={spinning ? reelOutcome : idleOutcome} moving={spinning && !reduced} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-[8px]">
          {!presentation && (
            <div className="seg w-full" role="group" aria-label="mode">
              {(['index', 'individual'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={rp.mode === m}
                  disabled={spinning}
                  className="flex h-[40px] flex-1 items-center justify-center px-1 text-[15px] font-bold"
                  onClick={() => changeMode(m)}
                  title={t(m === 'index' ? 'modeIndexDesc' : 'modeIndividualDesc')}
                >
                  {t(m === 'index' ? 'modeIndex' : 'modeIndividual')}
                </button>
              ))}
            </div>
          )}

          {individual ? (
            <div className="flex items-end justify-between gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[14px] font-semibold text-cream/80">{t('studentNo')}</span>
                <Stepper
                  value={input.student}
                  min={1}
                  max={GRADES[grade].students}
                  label={t('studentNo')}
                  onChange={(n) => st().setGachaInput({ student: n })}
                  disabled={spinning || !drawable}
                  width={64}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[14px] font-semibold text-cream/80">{t('investGold')}</span>
                <Stepper
                  value={input.gold}
                  min={1}
                  max={MAX_GOLD_PER_DRAW}
                  label={t('investGold')}
                  onChange={(n) => st().setGachaInput({ gold: n })}
                  disabled={spinning || !drawable}
                  width={56}
                />
              </label>
            </div>
          ) : (
            <Bi k="modeIndexDesc" size="xs" px={[15, 12]} weight={500} className="text-cream/80" />
          )}

          {!drawable && !rp.completed ? (
            <div className="flex h-[64px] items-center gap-3 border-[3px] border-black bg-choco px-3">
              <Lock size={24} className="flex-none text-cream/60" />
              <Bi k="drawOpensIn" p={{ round, time: formatSec(Math.max(0, sec - cfg.draw)) }} size="xs" px={[16, 12]} weight={600} className="text-cream/85" />
            </div>
          ) : indexDone || rp.completed ? (
            <div className="flex gap-2">
              <Btn tone="silver" className="h-[64px] flex-1 text-[17px]" disabled={!lastRecord || spinning} onClick={() => lastRecord && st().reviewRecord(lastRecord.uid)}>
                <RotateCw size={20} />
                {t('reviewResult')}
              </Btn>
            </div>
          ) : (
            <div className="flex gap-2">
              <Btn
                tone="gold"
                silent
                className={`h-[64px] flex-1 font-pixel text-[24px] ${spinning ? 'is-pressed' : ''}`}
                disabled={spinning}
                onClick={() => doSpin()}
                aria-keyshortcuts="S"
              >
                {spinning ? <span className="text-[16px]">{t('spinning')}</span> : t('spin')}
              </Btn>
              {individual && !presentation && (
                <Btn
                  tone="choco"
                  className="h-[64px] w-[104px] flex-col !gap-0 px-1 text-[13px] leading-tight"
                  disabled={spinning || drawnCount === 0}
                  onClick={() =>
                    st().askConfirm({
                      titleKey: 'confirmFinish_title',
                      bodyKey: 'confirmFinish_body',
                      params: { round },
                      onConfirm: () => st().completeRound(round),
                    })
                  }
                >
                  <span>{t('finishRound')}</span>
                  <span className="mt-1 font-pixel text-[11px] text-gold">{drawnCount}/{GRADES[grade].students}</span>
                </Btn>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
