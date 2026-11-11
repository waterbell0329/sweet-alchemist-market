import { useState } from 'react';
import { Landmark, Maximize2 } from 'lucide-react';
import { INVESTMENT_END_SEC, ROUND_SCHEDULE } from '../data/gameConfig';
import { OUTCOMES, OUTCOME_BY_ID, formatPct } from '../data/investments';
import { canDraw, payoutCoins, roundStatus } from '../engine/investmentEngine';
import { formatSec } from '../engine/timerEngine';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n';
import { drawWho } from '../utils/eventText';
import { GachaMachine } from './GachaMachine';
import { RoundTracker } from './RoundTracker';
import { Bi, Btn, Coin, CoinStack, PanelTitle } from './ui';

function StatusStrip() {
  const sec = useGame((s) => s.sec);
  const rounds = useGame((s) => s.rounds);
  const open = ROUND_SCHEDULE.find((c, i) => roundStatus(c, sec, rounds[i]) === 'open');
  const drawableRound = ROUND_SCHEDULE.find((c, i) => canDraw(roundStatus(c, sec, rounds[i])));
  const nextDraw = ROUND_SCHEDULE.find((c) => sec > c.draw);
  return (
    <div className="flex min-h-[58px] flex-col justify-center gap-[2px] border-[3px] border-black bg-choco px-3 py-[4px]">
      {open ? (
        <Bi k="openRoundLine" p={{ round: open.round, time: formatSec(sec - open.close) }} size="md" px={[22, 14]} weight={700} inline className="text-mint" />
      ) : (
        <Bi k={sec <= INVESTMENT_END_SEC ? 'investmentOver' : 'drawNotYet'} size="md" px={[22, 14]} weight={700} inline className="text-coral" />
      )}
      {drawableRound ? (
        <Bi k="drawReadyLine" p={{ round: drawableRound.round }} size="sm" px={[19, 13]} weight={700} inline className="text-gold" />
      ) : nextDraw ? (
        <Bi k="nextDrawLine" p={{ round: nextDraw.round, time: formatSec(sec - nextDraw.draw) }} size="sm" px={[19, 13]} weight={600} inline className="text-cream/90" />
      ) : (
        <Bi k="noMoreDraws" size="sm" px={[19, 13]} inline className="text-cream/70" />
      )}
    </div>
  );
}

export function OddsTable() {
  const [gold, setGold] = useState(1);
  const { t } = useT();
  return (
    <div className="flex flex-col border-[3px] border-black bg-choco">
      <div className="flex items-center justify-between gap-2 border-b-[3px] border-black px-[10px] py-[5px]">
        <Bi k="oddsTitle" size="sm" px={[18, 12]} weight={700} inline className="text-gold" />
        <div className="flex items-center gap-[6px]" role="group" aria-label={t('colPayout', { count: gold })}>
          <button type="button" className="btn btn-choco focus-ring h-[32px] w-[32px] text-[18px]" onClick={() => setGold((g) => Math.max(1, g - 1))} aria-label="−1">
            −
          </button>
          <span className="flex items-center gap-1 font-pixel text-[14px]">
            {gold}
            <Coin kind="gold" size={22} label={false} />
          </span>
          <button type="button" className="btn btn-choco focus-ring h-[32px] w-[32px] text-[18px]" onClick={() => setGold((g) => Math.min(10, g + 1))} aria-label="+1">
            +
          </button>
        </div>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[13px] text-cream/70">
            <th className="px-[10px] py-[3px] font-semibold">{t('colResult')}</th>
            <th className="px-1 py-[3px] text-right font-semibold">{t('colProb')}</th>
            <th className="px-1 py-[3px] text-right font-semibold">{t('colReturn')}</th>
            <th className="px-[8px] py-[2px] text-right font-semibold leading-tight">{t('colPayout', { count: gold })}</th>
          </tr>
        </thead>
        <tbody>
          {OUTCOMES.map((o) => {
            const total = payoutCoins(o.id, gold);
            const color = o.tone === 'danger' ? 'text-coral' : o.tone === 'success' ? 'text-mint' : 'text-gold';
            return (
              <tr key={o.id} className="border-t-2 border-black/50">
                <td className="px-[8px] py-[2px]">
                  <span className="flex items-center gap-2">
                    <span className="text-[22px]" aria-hidden>
                      {o.emoji}
                    </span>
                    <Bi k={`out_${o.id}` as TKey} size="sm" px={[17, 11]} weight={700} className="whitespace-nowrap leading-none" />
                  </span>
                </td>
                <td className="px-1 text-right font-pixel text-[16px] text-cream">{o.probability}%</td>
                <td className={`px-1 text-right font-pixel text-[16px] ${color}`}>{formatPct(o.returnPct)}</td>
                <td className="px-[10px]">
                  <span className="flex items-center justify-end gap-2">
                    <CoinStack total={total} size={16} max={5} />
                    <span className="w-[34px] text-right font-pixel text-[17px]">{total}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function History() {
  const draws = useGame((s) => s.draws);
  const reviewRecord = useGame((s) => s.reviewRecord);
  const busy = useGame((s) => s.spinState.status !== 'idle');
  const { lang } = useT();
  const recent = draws.slice(-5).reverse();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-[3px] border-black bg-choco">
      <div className="border-b-[3px] border-black px-[10px] py-[7px]">
        <Bi k="historyTitle" size="sm" px={[17, 12]} weight={700} inline className="text-gold" />
      </div>
      {recent.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-3 text-center">
          <Bi k="historyEmpty" size="xs" px={[15, 12]} className="items-center text-cream/60" />
        </div>
      ) : (
        <ul className="flex flex-col">
          {recent.map((r) => {
            const o = OUTCOME_BY_ID[r.outcomeId];
            const color = o.tone === 'danger' ? 'text-coral' : o.tone === 'success' ? 'text-mint' : 'text-gold';
            return (
              <li key={r.uid} className="border-t-2 border-black/50 first:border-t-0">
                <button
                  type="button"
                  className={`focus-ring flex h-[41px] w-full items-center gap-2 px-[8px] text-left hover:bg-choco-3 ${r.voided ? 'opacity-45' : ''}`}
                  onClick={() => reviewRecord(r.uid)}
                  disabled={busy}
                >
                  <span className="font-pixel text-[11px] text-gold">R{r.round}</span>
                  <span className={`min-w-0 flex-1 whitespace-nowrap text-[15px] font-semibold ${r.voided ? 'line-through' : ''}`}>{drawWho(lang, r)}</span>
                  <span className={`text-right font-pixel text-[11px] ${color}`} aria-label={o.id}>
                    {formatPct(o.returnPct)}
                  </span>
                  <span className="w-[26px] text-right font-pixel text-[11px] text-cream">{r.payoutCoins}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function InvestmentPanel() {
  const { t } = useT();
  const setStage = useGame((s) => s.setGachaStage);
  return (
    <section className="panel flex h-full flex-col overflow-hidden" aria-label="investment bank">
      <PanelTitle
        k="bankTitle"
        icon={<Landmark size={26} className="text-gold" strokeWidth={2.5} />}
        right={
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-2 border-2 border-black bg-gold px-2 py-[2px] text-black">
              <Coin kind="gold" size={22} label={false} />
              <Bi k="goldOnly" size="xs" px={[14, 11]} weight={700} inline />
            </span>
            <Btn tone="gold" className="h-[40px] px-3 text-[15px]" onClick={() => setStage(true)}>
              <Maximize2 size={18} /> {t('gachaFullscreen')}
            </Btn>
          </span>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-[16px] p-[14px]">
        <div className="flex min-h-0 flex-col gap-[14px]">
          <StatusStrip />
          <RoundTracker />
          <GachaMachine />
        </div>
        <div className="flex min-h-0 flex-col gap-[12px]">
          <OddsTable />
          <History />
        </div>
      </div>
    </section>
  );
}
