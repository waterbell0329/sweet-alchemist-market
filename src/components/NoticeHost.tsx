import { useEffect, useRef, type ReactNode } from 'react';
import { BellRing, Clock, Siren, Store, Trophy } from 'lucide-react';
import { NEWS_BY_ID, SCHEDULE } from '../data/events';
import { PHASE_AT, ROUND_SCHEDULE } from '../data/gameConfig';
import { nextUpcomingEvent } from '../engine/eventScheduler';
import { sound, type SoundName } from '../engine/soundEngine';
import { formatSec } from '../engine/timerEngine';
import { getAppStore, isTaskNotice, useGame } from '../store/gameStore';
import { useT, type BiText } from '../hooks/useT';
import { translate, type Lang, type TKey } from '../i18n';
import type { Notice } from '../store/types';
import { eventName, newsDescKey, newsTitleKey } from '../utils/eventText';
import { NewsChanges } from './BreakingNewsModal';
import { fireConfetti } from './GachaResultModal';
import { Bi, Btn, Overlay } from './ui';

export const SOUND_FOR: Record<string, SoundName> = {
  news: 'news',
  roundClose: 'siren',
  roundDraw: 'alert',
  'phase:market': 'fanfare',
  'phase:lastCall': 'siren',
  'phase:closed': 'marketClosed',
  'phase:end': 'awards',
};

export const kindKey = (n: Notice) => (n.kind === 'phase' ? `phase:${n.phase}` : n.kind);

/** Information-only cards close themselves after this long; cards with a job for the teacher wait. */
const AUTO_MS = 12000;
const RING = { gold: '#FFD700', coral: '#F43F5E', mint: '#10B981' } as const;

interface Step {
  label: TKey;
  run: () => void;
}
interface Card {
  tone: keyof typeof RING;
  icon: ReactNode;
  title: TKey | BiText;
  titleParams?: Record<string, number>;
  body?: ReactNode;
  /** The button that moves the class to the next step (also Enter). */
  primary: Step;
  secondary?: Step;
  auto: boolean;
  hazard?: boolean;
}

const nextUpBi = (sec: number): BiText | null => {
  const e = nextUpcomingEvent(SCHEDULE, sec);
  if (!e) return null;
  const f = (l: Lang) => translate(l, 'nextUpLine', { event: eventName(l, e), time: formatSec(sec - e.remainingSeconds) });
  return { id: f('id'), ko: f('ko') };
};

/**
 * Every scheduled moment appears as one big card with the next step as its main button.
 * Info cards (market open, news, last call, closed) close on their own; a round close waits for the
 * teacher ([later] parks it in the bottom TaskStrip); a draw time opens the full-screen gacha directly. Moments the clock jumped over are not replayed.
 */
export function NoticeHost() {
  // Draw times never wait in line for a card: they open the full-screen gacha (effect below).
  const head = useGame((s) => s.notices.find((n) => n.kind !== 'roundDraw' && !(isTaskNotice(n) && n.skipped)) ?? null);
  const liveDraw = useGame((s) => s.notices.find((n) => n.kind === 'roundDraw' && !n.skipped) ?? null);
  const spinBusy = useGame((s) => s.spinState.status !== 'idle');
  const snoozed = useGame((s) => s.snoozedNotice);
  const awardShowing = useGame((s) => s.awardShowing);
  const ack = useGame((s) => s.acknowledgeNotice);
  const sec = useGame((s) => s.sec);
  const lastSound = useRef<string | null>(null);
  const { t } = useT();

  const isEnd = head?.kind === 'phase' && head.phase === 'end';
  const stale = !!head && head.skipped && !isTaskNotice(head) && !isEnd;
  const visible = !!head && !stale && !spinBusy && snoozed !== head.uid && !awardShowing;
  const uid = head?.uid;
  const card = visible && head ? buildCard(head, sec) : null;
  const auto = !!card?.auto;

  useEffect(() => {
    if (stale && uid) ack(uid);
  }, [stale, uid, ack]);

  useEffect(() => {
    if (!visible || !head || lastSound.current === head.uid) return;
    lastSound.current = head.uid;
    sound.play(SOUND_FOR[kindKey(head)] ?? 'alert');
    if (head.kind === 'phase' && head.phase === 'market' && !head.skipped) fireConfetti('normal');
  }, [visible, head]);

  // Draw time: bring the gacha machine in full screen with this round selected. A card that is due at
  // the same second (e.g. the next round closing) still shows on top of it.
  const drawUid = liveDraw?.uid;
  useEffect(() => {
    if (!drawUid || spinBusy || awardShowing) return;
    sound.play('alert');
    ack(drawUid, 'gotoGacha');
  }, [drawUid, spinBusy, awardShowing, ack]);

  useEffect(() => {
    if (!visible || !uid || !auto) return;
    const id = window.setTimeout(() => ack(uid), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [visible, uid, auto, ack]);

  // Enter = main button (dispatched by the keyboard hook).
  const primaryRef = useRef<(() => void) | null>(null);
  primaryRef.current = card ? card.primary.run : null;
  useEffect(() => {
    const on = () => primaryRef.current?.();
    window.addEventListener('sam:primary', on);
    return () => window.removeEventListener('sam:primary', on);
  }, []);

  if (!card || !head) return null;
  const ring = RING[card.tone];
  const next = nextUpBi(sec);
  const title = typeof card.title === 'string' ? { k: card.title } : { text: card.title };

  return (
    <Overlay z={35} label={t('pendingQueue', { count: 1 })}>
      <div className="flex h-full w-full items-center justify-center px-8" onClick={card.auto ? () => ack(head.uid) : undefined}>
        <div
          className="panel pop-in relative flex w-[1400px] flex-col items-center overflow-hidden text-center"
          style={{ boxShadow: `0 0 0 8px ${ring}, 16px 16px 0 8px #000` }}
          onClick={(e) => e.stopPropagation()}
        >
          {card.hazard && <div className="hazard h-[28px] w-full border-b-4 border-black" aria-hidden />}
          <div className="flex w-full flex-col items-center gap-6 px-14 pb-8 pt-8">
            <div className="flex items-center justify-center gap-8">
              <div className="slot slot-dark h-[132px] w-[132px] flex-none text-[80px]" style={{ color: ring }}>
                {card.icon}
              </div>
              <Bi {...title} p={card.titleParams} size="hero" px={[84, 34]} weight={700} className="items-start text-left" secondaryClassName="mt-2" />
            </div>
            {card.body && <div className="w-full max-w-[1200px]">{card.body}</div>}
            {head.skipped && <Bi k="skippedNote" size="sm" className="items-center text-cream/60" />}
            <div className="mt-2 flex items-center gap-5">
              {card.secondary && (
                <Btn tone="choco" className="h-[76px] px-8 text-[24px]" onClick={card.secondary.run}>
                  {t(card.secondary.label)}
                </Btn>
              )}
              <Btn tone={card.tone === 'coral' ? 'coral' : card.tone === 'mint' ? 'mint' : 'gold'} className="h-[88px] min-w-[360px] px-10 text-[32px]" onClick={card.primary.run} autoFocus>
                {t(card.primary.label)} ▶
              </Btn>
            </div>
            {next && (
              <span className="flex items-center gap-3 text-cream/80">
                <Clock size={24} />
                <Bi text={next} size="md" px={[24, 15]} weight={600} inline />
              </span>
            )}
          </div>
          {card.auto && <div key={head.uid} className="auto-close-bar h-[10px] w-full" style={{ background: ring, animationDuration: `${AUTO_MS}ms` }} aria-hidden />}
          {card.hazard && <div className="hazard h-[28px] w-full border-t-4 border-black" aria-hidden />}
        </div>
      </div>
    </Overlay>
  );
}

function buildCard(n: Notice, sec: number): Card {
  const s = () => getAppStore().getState();
  const done = () => s().acknowledgeNotice(n.uid);
  const later: Step = { label: 'deferToStrip', run: () => s().deferNotice(n.uid) };
  const body = (k: TKey, extra?: ReactNode) => (
    <div className="flex flex-col items-center gap-5">
      <Bi k={k} size="xl" px={[36, 20]} weight={600} className="items-center" />
      {extra}
    </div>
  );

  switch (n.kind) {
    case 'news': {
      const def = NEWS_BY_ID[n.newsId!];
      return {
        tone: def.tone === 'danger' ? 'coral' : 'gold',
        icon: <span aria-hidden>{def.emoji}</span>,
        title: newsTitleKey(def.id),
        body: body(newsDescKey(def.id), <NewsChanges notice={n} />),
        primary: { label: 'go_market', run: () => (s().setScreen('market'), done()) },
        auto: true,
      };
    }
    case 'roundClose': {
      const cfg = ROUND_SCHEDULE[n.round! - 1];
      return {
        tone: 'coral',
        hazard: true,
        icon: <Siren size={80} strokeWidth={2.4} />,
        title: 'notice_roundClose_title',
        titleParams: { round: n.round! },
        body: body(
          'notice_roundClose_body',
          <span className="border-4 border-black bg-gold px-5 py-2 text-black">
            <Bi k="drawOpensIn" p={{ round: n.round!, time: formatSec(Math.max(0, sec - cfg.draw)) }} size="lg" px={[30, 16]} weight={700} inline />
          </span>,
        ),
        primary: { label: 'notice_roundClose_btn', run: done },
        secondary: later,
        auto: false,
      };
    }
    default:
      break;
  }

  switch (n.phase) {
    case 'market':
      return {
        tone: 'mint',
        icon: <Store size={80} strokeWidth={2.4} />,
        title: 'notice_market_title',
        body: body('notice_market_body'),
        primary: { label: 'go_market', run: () => (s().setScreen('market'), done()) },
        auto: true,
      };
    case 'lastCall':
      return {
        tone: 'coral',
        hazard: true,
        icon: <BellRing size={80} strokeWidth={2.4} />,
        title: 'notice_lastCall_title',
        body: body(
          'notice_lastCall_body',
          <span className="border-4 border-black bg-gold px-5 py-2 text-black">
            <Bi k="shopTimeLeft" p={{ time: formatSec(Math.max(0, sec - PHASE_AT.closed)) }} size="lg" px={[30, 16]} weight={700} inline />
          </span>,
        ),
        primary: { label: 'confirm', run: done },
        auto: true,
      };
    case 'closed':
      return {
        tone: 'coral',
        icon: <Store size={80} strokeWidth={2.4} />,
        title: 'notice_closed_title',
        body: (
          <ul className="grid grid-cols-2 gap-4 text-left">
            {(['notice_closed_b1', 'notice_closed_b2', 'notice_closed_b3', 'notice_closed_b4'] as TKey[]).map((k, i) => (
              <li key={k} className="flex items-center gap-4 border-[3px] border-black bg-choco px-5 py-4">
                <span className="text-[40px]" aria-hidden>
                  {['🛒', '⚗️', '🍬', '🏆'][i]}
                </span>
                <Bi k={k} size="lg" px={[28, 16]} weight={600} />
              </li>
            ))}
          </ul>
        ),
        primary: { label: 'confirm', run: done },
        secondary: { label: 'openAwards', run: () => s().acknowledgeNotice(n.uid, 'openAwards') },
        auto: true,
      };
    default:
      return {
        tone: 'gold',
        icon: <Trophy size={80} strokeWidth={2.4} />,
        title: 'notice_end_title',
        body: body('notice_end_body'),
        primary: { label: 'openAwards', run: () => s().acknowledgeNotice(n.uid, 'openAwards') },
        secondary: { label: 'later', run: () => s().snoozeNotice(n.uid) },
        auto: false,
      };
  }
}
