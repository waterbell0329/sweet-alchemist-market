import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { OUTCOME_BY_ID, formatPct } from '../data/investments';
import { GOLD_VALUE } from '../data/gameConfig';
import { payoutCoins } from '../engine/investmentEngine';
import { sound } from '../engine/soundEngine';
import { useGame } from '../store/gameStore';
import { coinPhrase, useT } from '../hooks/useT';
import { translate, type TKey } from '../i18n';
import { Bi, Btn, Coin, CoinStack, Overlay } from './ui';

const GOLD = ['#FFD700', '#FFF1A1', '#E8954A', '#FFFDF9'];

export function fireConfetti(intensity: 'normal' | 'big') {
  try {
    const base = { disableForReducedMotion: true, colors: GOLD, zIndex: 9999 };
    confetti({ ...base, particleCount: intensity === 'big' ? 180 : 110, spread: 90, origin: { y: 0.55 } });
    if (intensity === 'big') {
      const end = Date.now() + 1800;
      const frame = () => {
        confetti({ ...base, particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
        confetti({ ...base, particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  } catch {
    /* canvas unavailable */
  }
}

export function GachaResultModal() {
  const spinState = useGame((s) => s.spinState);
  const record = useGame((s) => s.draws.find((d) => d.uid === s.spinState.recordId));
  const closeSpin = useGame((s) => s.closeSpin);
  const { t } = useT();
  const played = useRef<string | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const visible = spinState.status === 'revealed' && !!record;

  useEffect(() => {
    if (!visible || !record) return;
    okRef.current?.focus();
    if (spinState.review || played.current === record.uid) return;
    played.current = record.uid;
    const id = record.outcomeId;
    sound.stopDrumroll();
    if (id === 'bankrupt') sound.play('bankrupt');
    else if (id === 'loss') sound.play('loss');
    else if (id === 'interest') sound.play('win');
    else if (id === 'bigWin') {
      sound.play('fanfare');
      fireConfetti('normal');
    } else {
      sound.play('jackpot');
      fireConfetti('big');
    }
  }, [visible, record, spinState.review]);

  if (!visible || !record) return null;
  const o = OUTCOME_BY_ID[record.outcomeId];
  const color = o.tone === 'danger' ? '#F43F5E' : o.tone === 'success' ? '#10B981' : '#FFD700';
  const individual = record.mode === 'individual';
  const receive = (lang: 'id' | 'ko') =>
    translate(lang, individual ? 'res_receive' : 'res_receiveIndex', { amount: coinPhrase(lang, record.payoutCoins) });

  return (
    <Overlay z={40} label={t(`res_${o.id}` as TKey)}>
      <div
        className={`panel relative flex w-[1240px] flex-col items-center overflow-hidden px-10 pb-8 pt-6 text-center ${o.id === 'bankrupt' && !spinState.review ? 'shake' : ''}`}
        style={{ borderColor: '#000', boxShadow: `0 0 0 6px ${color}, 14px 14px 0 6px #000`, background: o.id === 'bankrupt' ? '#3a1018' : '#2C1E14' }}
      >
        {o.id === 'jackpot' && <div className="rays pointer-events-none absolute left-1/2 top-1/2 h-[1800px] w-[1800px] -translate-x-1/2 -translate-y-1/2" aria-hidden />}
        <div className="relative flex w-full items-center justify-between">
          <Bi k="res_round" p={{ round: record.round }} size="lg" px={[26, 16]} inline className="text-gold" weight={700} />
          {individual ? (
            <span className="border-[3px] border-black bg-cream px-3 py-1 text-black">
              <Bi k="res_student" p={{ student: record.studentNumber ?? 0 }} size="lg" px={[28, 16]} weight={700} inline />
            </span>
          ) : (
            <span className="border-[3px] border-black bg-gold px-3 py-1 text-black">
              <Bi k="modeIndex" size="md" px={[22, 14]} weight={700} inline />
            </span>
          )}
        </div>

        <div className="relative mt-2 flex items-center justify-center gap-8">
          <span className={`text-[140px] leading-none ${o.id === 'jackpot' ? 'float-crown' : 'pop-in'}`} aria-hidden>
            {o.emoji}
          </span>
          <span className="pop-in font-pixel leading-none" style={{ fontSize: 132, color, textShadow: '8px 8px 0 #000' }}>
            {formatPct(o.returnPct)}
          </span>
          {o.id === 'loss' && (
            <span className="arrow-drop font-pixel text-[90px] text-coral" aria-hidden>
              ▼
            </span>
          )}
          {o.id === 'interest' && (
            <span className="relative h-[120px] w-[60px]" aria-hidden>
              <span className="coin-rise absolute bottom-0 left-0 text-[44px]">🪙</span>
            </span>
          )}
        </div>

        <Bi k={`res_${o.id}` as TKey} size="hero" px={[64, 28]} weight={700} className="relative mt-4 items-center" />

        <div className="relative mt-5 flex items-center gap-6 border-4 border-black bg-choco px-8 py-4" style={{ boxShadow: '6px 6px 0 #000' }}>
          <CoinStack total={record.payoutCoins} size={58} max={10} />
          <div className="text-left">
            <Bi text={{ id: receive('id'), ko: receive('ko') }} size="2xl" px={[40, 22]} weight={700} className="text-gold" />
            {individual && (
              <Bi
                k="res_investLine"
                p={{ gold: record.investmentGold, coins: record.investmentGold * GOLD_VALUE, total: record.payoutCoins }}
                size="sm"
                px={[19, 14]}
                className="mt-1 text-cream/80"
                inline
                weight={500}
              />
            )}
          </div>
        </div>

        {!individual && (
          <div className="relative mt-4 flex flex-col items-center">
            <Bi k="res_indexNote" size="md" px={[20, 14]} inline className="text-cream/85" weight={500} />
            <div className="mt-3 flex gap-3">
              {[1, 2, 3, 4].map((g) => (
                <div key={g} className="flex items-center gap-2 border-[3px] border-black bg-choco-3 px-3 py-2">
                  <span className="font-pixel text-[16px]">{g}</span>
                  <Coin kind="gold" size={24} label={false} />
                  <span className="font-pixel text-[14px] text-cream/70">→</span>
                  <span className="font-pixel text-[22px] text-gold">{payoutCoins(o.id, g)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative mt-6 flex gap-4">
          <Btn ref={okRef} tone="gold" className="h-[72px] min-w-[260px] px-8 text-[26px]" onClick={closeSpin} aria-keyshortcuts="Enter">
            {individual && !spinState.review ? `${t('nextStudent')} ▶` : t('confirm')}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}
