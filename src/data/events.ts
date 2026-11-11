import { PHASE_AT, ROUND_SCHEDULE } from './gameConfig';
import type { ShopItemId } from './recipes';

export type NewsId = 'cocoaHarvest' | 'cheeseShortage' | 'visitingAlchemist' | 'finalSale';

export type NewsDuration =
  | { type: 'fixed'; seconds: number }
  | { type: 'untilEnd' }
  | { type: 'untilRemaining'; remainingSec: number };

export interface NewsDef {
  id: NewsId;
  emoji: string;
  effects: { items: ShopItemId[]; price: number }[];
  duration: NewsDuration;
  /** Remaining second at which the news fires automatically (null = teacher only). */
  autoAt: number | null;
  tone: 'success' | 'danger' | 'gold';
}

export const NEWS: NewsDef[] = [
  {
    id: 'cocoaHarvest',
    emoji: '🌱',
    effects: [{ items: ['kakao'], price: 1 }],
    duration: { type: 'fixed', seconds: 300 },
    autoAt: 2400, // 40:00
    tone: 'success',
  },
  {
    id: 'cheeseShortage',
    emoji: '🧀',
    effects: [{ items: ['keju'], price: 4 }],
    duration: { type: 'untilEnd' },
    autoAt: 1500, // 25:00
    tone: 'danger',
  },
  {
    id: 'visitingAlchemist',
    emoji: '🧙',
    effects: [{ items: ['recipeGacha'], price: 2 }],
    duration: { type: 'fixed', seconds: 180 },
    autoAt: null,
    tone: 'gold',
  },
  {
    id: 'finalSale',
    emoji: '🏷️',
    effects: [{ items: ['susu', 'kakao', 'tepung', 'gula', 'keju'], price: 1 }],
    duration: { type: 'untilRemaining', remainingSec: PHASE_AT.closed },
    autoAt: null,
    tone: 'success',
  },
];

export const NEWS_BY_ID: Record<NewsId, NewsDef> = Object.fromEntries(NEWS.map((n) => [n.id, n])) as Record<NewsId, NewsDef>;

/* ---------------- Central schedule ---------------- */

export type PhaseEventKind = 'market' | 'lastCall' | 'closed' | 'end';

export type ScheduledEvent =
  | { id: string; remainingSeconds: number; priority: number; type: 'phase'; payload: { phase: PhaseEventKind } }
  | { id: string; remainingSeconds: number; priority: number; type: 'roundClose'; payload: { round: number } }
  | { id: string; remainingSeconds: number; priority: number; type: 'roundDraw'; payload: { round: number } }
  | { id: string; remainingSeconds: number; priority: number; type: 'news'; payload: { newsId: NewsId } };

/** Lower number = handled/shown first when events share the same second. */
export const PRIORITY = { phaseCritical: 0, phase: 1, roundClose: 2, roundDraw: 3, news: 5 } as const;

export function buildSchedule(): ScheduledEvent[] {
  const events: ScheduledEvent[] = [
    { id: 'phase:market', remainingSeconds: PHASE_AT.market, priority: PRIORITY.phase, type: 'phase', payload: { phase: 'market' } },
    { id: 'phase:lastCall', remainingSeconds: PHASE_AT.lastCall, priority: PRIORITY.phase, type: 'phase', payload: { phase: 'lastCall' } },
    { id: 'phase:closed', remainingSeconds: PHASE_AT.closed, priority: PRIORITY.phaseCritical, type: 'phase', payload: { phase: 'closed' } },
    { id: 'phase:end', remainingSeconds: PHASE_AT.end, priority: PRIORITY.phaseCritical, type: 'phase', payload: { phase: 'end' } },
  ];
  for (const r of ROUND_SCHEDULE) {
    events.push({ id: `round:${r.round}:close`, remainingSeconds: r.close, priority: PRIORITY.roundClose, type: 'roundClose', payload: { round: r.round } });
    events.push({ id: `round:${r.round}:draw`, remainingSeconds: r.draw, priority: PRIORITY.roundDraw, type: 'roundDraw', payload: { round: r.round } });
  }
  for (const n of NEWS) {
    if (n.autoAt !== null)
      events.push({ id: `news:${n.id}`, remainingSeconds: n.autoAt, priority: PRIORITY.news, type: 'news', payload: { newsId: n.id } });
  }
  return events.sort((a, b) => b.remainingSeconds - a.remainingSeconds || a.priority - b.priority);
}

export const SCHEDULE: ScheduledEvent[] = buildSchedule();

/** Seconds at which countdown beeps should lead up to (key moments). */
export const BEEP_TARGETS: number[] = Array.from(
  new Set(SCHEDULE.filter((e) => e.type !== 'news').map((e) => e.remainingSeconds)),
);
