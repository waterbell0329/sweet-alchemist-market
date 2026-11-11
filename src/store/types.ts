import type { Grade, UiScale } from '../data/gameConfig';
import type { NewsId, PhaseEventKind } from '../data/events';
import type { OutcomeId } from '../data/investments';
import type { ShopItemId } from '../data/recipes';
import type { RoundProgress } from '../engine/investmentEngine';
import type { ActiveNews, ManualPrices, Trend } from '../engine/marketEngine';
import type { TimerState } from '../engine/timerEngine';
import type { LangMode, Params, TKey } from '../i18n';

export interface Notice {
  uid: string;
  kind: 'phase' | 'roundClose' | 'roundDraw' | 'news';
  phase?: PhaseEventKind;
  round?: number;
  newsId?: NewsId;
  activeUid?: string;
  /** Game second (remaining) of the scheduled moment. */
  atSec: number;
  /** True when the clock jumped over the moment instead of running through it. */
  skipped: boolean;
  manual?: boolean;
}

export interface DrawRecord {
  uid: string;
  round: number;
  mode: 'index' | 'individual';
  studentNumber: number | null;
  investmentGold: number;
  outcomeId: OutcomeId;
  roll: number;
  payoutCoins: number;
  timestamp: number;
  atSec: number;
  voided: boolean;
}

export type LogEntry =
  | { uid: string; kind: 'event'; eventId: string; atSec: number }
  | { uid: string; kind: 'draw'; recordId: string; atSec: number }
  | { uid: string; kind: 'news' | 'newsEnd' | 'newsCancel'; newsId: NewsId; atSec: number };

export type AwardId = 'master' | 'investor' | 'merchant' | 'negotiator';
export const AWARD_IDS: AwardId[] = ['master', 'investor', 'merchant', 'negotiator'];

export interface SpinState {
  status: 'idle' | 'spinning' | 'revealed';
  recordId: string | null;
  /** Re-showing an earlier result: no sound, no confetti, no auto-advance. */
  review: boolean;
}

export interface PersistedGame {
  schema: 1;
  savedAt: number;
  lang: LangMode;
  grade: Grade;
  muted: boolean;
  timer: TimerState;
  started: boolean;
  lastSec: number;
  executed: string[];
  notices: Notice[];
  manualPrices: ManualPrices;
  activeNews: ActiveNews[];
  newsSeq: number;
  priceMemory: Record<ShopItemId, number>;
  trends: Record<ShopItemId, Trend>;
  rounds: RoundProgress[];
  draws: DrawRecord[];
  spinState: SpinState;
  selectedRound: number | null;
  gachaInput: { student: number; gold: number };
  tutorial: { open: boolean; slide: number };
  awards: Record<AwardId, string>;
  awardsRevealed: AwardId[];
  view: 'dashboard' | 'awards';
  presentation: boolean;
  locked: boolean;
  /** Content zoom (see UI_SCALES). Survives reset like lang/grade. */
  uiScale: UiScale;
  log: LogEntry[];
}

export interface Toast {
  uid: string;
  key: TKey;
  params?: Params;
  /** Params that are themselves translation keys (re-translated on language change). */
  keyParams?: Record<string, TKey>;
  tone: 'info' | 'success' | 'danger';
}

export interface ConfirmRequest {
  titleKey: TKey;
  bodyKey: TKey;
  params?: Params;
  keyParams?: Record<string, TKey>;
  confirmKey?: TKey;
  danger?: boolean;
  onConfirm: () => void;
  /** Optional second confirmation step (used for full reset). */
  next?: Omit<ConfirmRequest, 'onConfirm' | 'next'>;
}
