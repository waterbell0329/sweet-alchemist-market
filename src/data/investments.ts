export type OutcomeId = 'bankrupt' | 'loss' | 'interest' | 'bigWin' | 'jackpot';

export interface Outcome {
  id: OutcomeId;
  emoji: string;
  /** Integer percent; all outcomes must sum to 100. */
  probability: number;
  /** Net return relative to the principal, in percent. */
  returnPct: number;
  tone: 'danger' | 'success' | 'gold';
}

export const OUTCOMES: readonly Outcome[] = [
  { id: 'bankrupt', emoji: '💥', probability: 15, returnPct: -60, tone: 'danger' },
  { id: 'loss', emoji: '📉', probability: 20, returnPct: -20, tone: 'danger' },
  { id: 'interest', emoji: '🏦', probability: 30, returnPct: 20, tone: 'success' },
  { id: 'bigWin', emoji: '📈', probability: 25, returnPct: 100, tone: 'gold' },
  { id: 'jackpot', emoji: '👑', probability: 10, returnPct: 200, tone: 'gold' },
] as const;

export const OUTCOME_BY_ID: Record<OutcomeId, Outcome> = Object.fromEntries(OUTCOMES.map((o) => [o.id, o])) as Record<
  OutcomeId,
  Outcome
>;

export function formatPct(pct: number): string {
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
}
