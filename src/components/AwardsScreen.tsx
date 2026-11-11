import { useEffect } from 'react';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { sound } from '../engine/soundEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { AWARD_IDS, type AwardId } from '../store/types';
import type { TKey } from '../i18n';
import { fireConfetti } from './GachaResultModal';
import { Bi, Btn, Overlay } from './ui';

const AWARD_META: Record<AwardId, { emoji: string; color: string }> = {
  master: { emoji: '🏆', color: '#FFD700' },
  investor: { emoji: '👑', color: '#E8954A' },
  merchant: { emoji: '💰', color: '#10B981' },
  negotiator: { emoji: '🤝', color: '#E2E8F0' },
};

function Reveal() {
  const showing = useGame((s) => s.awardShowing);
  const winner = useGame((s) => (s.awardShowing ? s.awards[s.awardShowing] : ''));
  const close = useGame((s) => s.closeAwardShow);
  const { t } = useT();
  useEffect(() => {
    if (!showing) return;
    sound.play('awards');
    fireConfetti('big');
  }, [showing]);
  if (!showing) return null;
  const meta = AWARD_META[showing];
  return (
    <Overlay z={45} label={t(`aw_${showing}` as TKey)}>
      <div className="relative flex h-[820px] w-[1500px] flex-col items-center justify-center overflow-hidden border-4 border-black bg-choco-2" style={{ boxShadow: `0 0 0 8px ${meta.color}, 16px 16px 0 8px #000` }}>
        <div className="rays pointer-events-none absolute left-1/2 top-1/2 h-[2200px] w-[2200px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <span className="float-crown relative text-[150px] leading-none" aria-hidden>
          👑
        </span>
        <span className="relative mt-2 text-[96px] leading-none" aria-hidden>
          {meta.emoji}
        </span>
        <Bi k={`aw_${showing}` as TKey} size="3xl" px={[58, 28]} weight={700} className="relative mt-6 items-center" />
        <div className="pop-in relative mt-8 border-[6px] border-black bg-gold px-16 py-6 text-black" style={{ boxShadow: '10px 10px 0 #000' }}>
          <span className="block max-w-[1200px] break-words text-center text-[120px] font-bold leading-none">{winner}</span>
        </div>
        <Bi k="congrats" size="3xl" px={[56, 26]} weight={700} pixel className="relative mt-8 items-center text-gold" />
        <Btn tone="cream" className="relative mt-8 h-[68px] min-w-[220px] text-[24px]" onClick={close} autoFocus>
          {t('close')}
        </Btn>
      </div>
    </Overlay>
  );
}

export function AwardsScreen() {
  const awards = useGame((s) => s.awards);
  const revealed = useGame((s) => s.awardsRevealed);
  const setAward = useGame((s) => s.setAward);
  const revealAward = useGame((s) => s.revealAward);
  const setView = useGame((s) => s.setView);
  const presentation = useGame((s) => s.presentation);
  const { t } = useT();

  return (
    <section className="absolute inset-x-4 bottom-4 top-[200px] flex flex-col border-4 border-black bg-choco-2" style={{ boxShadow: '0 0 0 4px #FFD700, 10px 10px 0 4px #000' }} aria-label={t('awardsTitle')}>
      <div className="flex items-center gap-5 border-b-4 border-black bg-choco px-6 py-4">
        <span className="text-[56px]" aria-hidden>
          🏆
        </span>
        <div className="flex-1">
          <Bi k="awardsTitle" size="3xl" px={[52, 22]} weight={700} pixel className="text-gold" />
          {!presentation && <Bi k="awardsHint" size="sm" px={[18, 13]} inline className="mt-2 text-cream/70" weight={500} />}
        </div>
        <Btn tone="choco" className="h-[64px] px-6 text-[20px]" onClick={() => setView('dashboard')}>
          <ArrowLeft size={24} /> {t('backToDashboard')}
        </Btn>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-8 p-8">
        {AWARD_IDS.map((id) => {
          const meta = AWARD_META[id];
          const done = revealed.includes(id);
          return (
            <div key={id} className="flex flex-col justify-between gap-4 border-4 border-black bg-choco p-6" style={{ boxShadow: `0 0 0 4px ${meta.color}, 8px 8px 0 4px #000` }}>
              <div className="flex items-center gap-5">
                <div className="slot slot-dark h-[110px] w-[110px] flex-none text-[64px]" aria-hidden>
                  {meta.emoji}
                </div>
                <Bi k={`aw_${id}` as TKey} size="2xl" px={[44, 22]} weight={700} />
                {done && (
                  <span className="ml-auto border-[3px] border-black bg-mint px-3 py-1 text-[16px] font-bold text-black">✓ {t('announced')}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <input
                  className="input-pixel h-[76px] min-w-0 flex-1 !font-body !text-[34px] font-bold"
                  value={awards[id]}
                  maxLength={40}
                  placeholder={t('winnerPlaceholder')}
                  aria-label={`${t(`aw_${id}` as TKey)} — ${t('winnerPlaceholder')}`}
                  onChange={(e) => setAward(id, e.target.value)}
                />
                <Btn tone="gold" className="h-[76px] min-w-[190px] px-5 text-[24px]" onClick={() => revealAward(id)} silent>
                  <Megaphone size={26} /> {t('announce')}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
      <Reveal />
    </section>
  );
}
