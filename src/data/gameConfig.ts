// Central game constants. UI and logic both read from here so they never disagree.

export const APP_VERSION = '1.0.0';
export const STORAGE_KEY = `sweet-alchemist-market:v${APP_VERSION.split('.')[0]}`;
export const STATE_SCHEMA_VERSION = 1;

/** Full game length: exactly 75 minutes. */
export const GAME_DURATION_SEC = 4500;
export const GAME_DURATION_MS = GAME_DURATION_SEC * 1000;

export type Grade = 4 | 6;
export const GRADES: Record<Grade, { students: number; rich: number; technician: number; tier2Need: number }> = {
  4: { students: 22, rich: 14, technician: 8, tier2Need: 2 },
  6: { students: 30, rich: 20, technician: 10, tier2Need: 3 },
};

export const COINS = {
  silver: { value: 1, stock: 300 },
  gold: { value: 5, stock: 200 },
} as const;
export const GOLD_VALUE = COINS.gold.value;

export const STARTER_PACKS = {
  rich: { gold: 1, silver: 2, total: 7, materials: 2, recipes: 0, sharePct: 65 },
  technician: { gold: 0, silver: 3, total: 3, materials: 1, recipes: 1, sharePct: 35 },
} as const;

/** Phase boundaries expressed as remaining seconds. */
export const PHASE_AT = {
  market: 3900, // 65:00 → Phase 2
  lastCall: 900, // 15:00 → Phase 3
  closed: 600, // 10:00 → Phase 4
  end: 0,
} as const;

export type PhaseId = 1 | 2 | 3 | 4;

/** Phase for a given remaining second (display seconds, i.e. ceil of ms). */
export function phaseFromRemainingSec(sec: number): PhaseId {
  if (sec > PHASE_AT.market) return 1;
  if (sec > PHASE_AT.lastCall) return 2;
  if (sec > PHASE_AT.closed) return 3;
  return 4;
}

/** "Next phase" button targets: 65:00 → 15:00 → 10:00 → 00:00 */
export const NEXT_PHASE_TARGETS = [PHASE_AT.market, PHASE_AT.lastCall, PHASE_AT.closed, PHASE_AT.end];

export function nextPhaseTargetSec(sec: number): number | null {
  for (const t of NEXT_PHASE_TARGETS) if (sec > t) return t;
  return null;
}

/* ---------------- Investment rounds (configurable) ---------------- */

export interface RoundConfig {
  round: number;
  /** Deposits may be accepted while remaining time is <= openFrom … */
  openFrom: number;
  /** … until this remaining second, when deposits are locked. */
  close: number;
  /** Draw becomes available at this remaining second (close − waitSec). */
  draw: number;
}

export const ROUND_COUNT = 5;
export const ROUND_RECRUIT_SEC = 600; // 10-minute recruiting window
export const ROUND_WAIT_SEC = 600; // draw opens exactly 10 minutes after close
export const FIRST_ROUND_CLOSE = 3900; // 65:00

export function buildRoundSchedule(
  count = ROUND_COUNT,
  firstClose = FIRST_ROUND_CLOSE,
  recruit = ROUND_RECRUIT_SEC,
  wait = ROUND_WAIT_SEC,
): RoundConfig[] {
  return Array.from({ length: count }, (_, i) => {
    const close = firstClose - i * recruit;
    return { round: i + 1, openFrom: Math.min(GAME_DURATION_SEC, close + recruit), close, draw: close - wait };
  });
}

export const ROUND_SCHEDULE: RoundConfig[] = buildRoundSchedule();
/** After this remaining second no new investment is possible. */
export const INVESTMENT_END_SEC = ROUND_SCHEDULE[ROUND_SCHEDULE.length - 1].close;

/** Number of rule slides in the opening tutorial. */
export const TUTORIAL_SLIDES = 10;

/** Content-size steps for the teacher's [A−]/[A+] (projector distance). 1 = original design size. */
export const UI_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
export type UiScale = (typeof UI_SCALES)[number];

/** Dashboard geometry on the 1920×1080 stage (px): left nav, then the one visible screen. */
export const LAYOUT = { navW: 156, mainLeft: 188, mainW: 1716, top: 196, bottom: 96, bottomWithTask: 168 } as const;

export type ScreenId = 'market' | 'craft' | 'invest';
/**
 * Effective zoom of the visible screen for the teacher's size setting. The bank is sparse at design
 * size so it starts larger; each screen is capped where its content still fits (checked at 1920×1080
 * with the task strip open and KO+ID labels).
 */
const BASE: Record<ScreenId, number> = { market: 1, craft: 1, invest: 1.3 };
export const ZOOM_MAX: Record<ScreenId, number> = { market: 1.5, craft: 1.3, invest: 1.4 };
export function contentZoom(screen: ScreenId, uiScale: number): number {
  return Math.min(BASE[screen] * uiScale, ZOOM_MAX[screen]);
}

/** Upper bound for a single student's gold investment (sanity guard for input). */
export const MAX_GOLD_PER_DRAW = 20;
