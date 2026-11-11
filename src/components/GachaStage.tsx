import { X } from 'lucide-react';
import { activeGachaRound, useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { GachaMachine } from './GachaMachine';
import { OddsTable } from './InvestmentPanel';
import { RoundTracker } from './RoundTracker';
import { Bi, Btn } from './ui';

/**
 * Full-screen gacha: comes in by itself when a draw time arrives (or from the bank's [full screen]).
 * Covers everything below the header so the whole class watches the spin; the timer stays visible.
 * The machine and table are the same components as the bank screen, just zoomed.
 */
export function GachaStage() {
  const open = useGame((s) => s.gachaStage);
  const setOpen = useGame((s) => s.setGachaStage);
  const busy = useGame((s) => s.spinState.status !== 'idle');
  const round = useGame((s) => activeGachaRound(s));
  const { t } = useT();
  if (!open) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-0 top-[196px] z-[26] flex flex-col gap-5 px-8 pb-6 pt-4"
      style={{ background: '#0d0905' }}
      role="dialog"
      aria-label={t('gachaTitle')}
    >
      <div className="flex items-center gap-6">
        <Bi k="notice_roundDraw_title" p={{ round }} size="hero" px={[64, 28]} weight={700} inline className="min-w-0 flex-1 text-gold" />
        <Btn tone="choco" className="h-[64px] flex-none px-6 text-[22px]" onClick={() => setOpen(false)} disabled={busy} aria-keyshortcuts="Escape">
          <X size={26} /> {t('backToDashboard')}
        </Btn>
      </div>
      <div className="w-[1393px] self-center" style={{ zoom: 1.3 }}>
        <RoundTracker />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-8">
        <div className="w-[640px]" style={{ zoom: 1.75 }}>
          <GachaMachine />
        </div>
        <div className="w-[520px]" style={{ zoom: 1.2 }}>
          <OddsTable />
        </div>
      </div>
    </div>
  );
}
