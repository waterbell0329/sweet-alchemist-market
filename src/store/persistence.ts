// Versioned, validated localStorage persistence. Any corrupt field falls back to its
// default instead of crashing the app.
import { GAME_DURATION_MS, GRADES, ROUND_COUNT, STATE_SCHEMA_VERSION, STORAGE_KEY, TUTORIAL_SLIDES, UI_SCALES, type Grade } from '../data/gameConfig';
import { NEWS_BY_ID, type NewsId } from '../data/events';
import { OUTCOME_BY_ID, type OutcomeId } from '../data/investments';
import { MATERIAL_IDS, PRICE_MODES, SHOP_ITEM_IDS, type PriceMode, type ShopItemId } from '../data/recipes';
import { createRoundProgress, type RoundProgress } from '../engine/investmentEngine';
import { defaultManualPrices, type ActiveNews, type ManualPrices, type Trend } from '../engine/marketEngine';
import { clampRemaining, createTimer, type TimerState } from '../engine/timerEngine';
import type { LangMode } from '../i18n';
import { AWARD_IDS, type AwardId, type DrawRecord, type LogEntry, type Notice, type PersistedGame } from './types';

export function defaultGame(keep?: Partial<Pick<PersistedGame, 'lang' | 'grade' | 'muted' | 'uiScale'>>): PersistedGame {
  return {
    schema: STATE_SCHEMA_VERSION,
    savedAt: 0,
    lang: keep?.lang ?? 'both',
    grade: keep?.grade ?? 4,
    muted: keep?.muted ?? false,
    timer: createTimer(),
    started: false,
    lastSec: GAME_DURATION_MS / 1000,
    executed: [],
    notices: [],
    manualPrices: defaultManualPrices(),
    activeNews: [],
    newsSeq: 0,
    priceMemory: {} as Record<ShopItemId, number>,
    trends: {} as Record<ShopItemId, Trend>,
    rounds: Array.from({ length: ROUND_COUNT }, createRoundProgress),
    draws: [],
    spinState: { status: 'idle', recordId: null, review: false },
    selectedRound: null,
    gachaInput: { student: 1, gold: 1 },
    tutorial: { open: true, slide: 0 },
    awards: { master: '', investor: '', merchant: '', negotiator: '' },
    awardsRevealed: [],
    view: 'dashboard',
    presentation: false,
    locked: false,
    uiScale: keep?.uiScale ?? 1,
    log: [],
  };
}

/* ---------------- tiny validators ---------------- */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const oneOf = <T extends string | number>(v: unknown, opts: readonly T[]): v is T => opts.includes(v as T);
const intIn = (v: unknown, lo: number, hi: number): v is number => isNum(v) && Number.isInteger(v) && v >= lo && v <= hi;
const arr = <T>(v: unknown, check: (x: unknown) => x is T, max = 2000): T[] =>
  Array.isArray(v) ? (v.filter(check) as T[]).slice(-max) : [];

const SEC_MAX = GAME_DURATION_MS / 1000;
const newsIds = Object.keys(NEWS_BY_ID) as NewsId[];
const outcomeIds = Object.keys(OUTCOME_BY_ID) as OutcomeId[];

function vTimer(v: unknown): TimerState {
  if (!isObj(v) || !isBool(v.running) || !isNum(v.anchorRemainingMs)) return createTimer();
  const anchorWallMs = isNum(v.anchorWallMs) ? v.anchorWallMs : null;
  return { running: v.running && anchorWallMs !== null, anchorWallMs, anchorRemainingMs: clampRemaining(v.anchorRemainingMs) };
}

const isNotice = (v: unknown): v is Notice =>
  isObj(v) && isStr(v.uid) && oneOf(v.kind, ['phase', 'roundClose', 'roundDraw', 'news'] as const) && isNum(v.atSec) &&
  (v.kind !== 'news' || oneOf(v.newsId, newsIds)) &&
  ((v.kind !== 'roundClose' && v.kind !== 'roundDraw') || intIn(v.round, 1, ROUND_COUNT)) &&
  (v.kind !== 'phase' || oneOf(v.phase, ['market', 'lastCall', 'closed', 'end'] as const));

const isActiveNews = (v: unknown): v is ActiveNews =>
  isObj(v) && isStr(v.uid) && oneOf(v.newsId, newsIds) && isNum(v.seq) && isNum(v.activatedAtSec) &&
  (v.expiresAtSec === null || isNum(v.expiresAtSec));

const isDraw = (v: unknown): v is DrawRecord =>
  isObj(v) && isStr(v.uid) && intIn(v.round, 1, ROUND_COUNT) && oneOf(v.mode, ['index', 'individual'] as const) &&
  (v.studentNumber === null || intIn(v.studentNumber, 1, 99)) && intIn(v.investmentGold, 1, 1000) &&
  oneOf(v.outcomeId, outcomeIds) && intIn(v.roll, 0, 99) && isNum(v.payoutCoins) && isNum(v.timestamp) && isNum(v.atSec) &&
  isBool(v.voided);

const isLog = (v: unknown): v is LogEntry =>
  isObj(v) && isStr(v.uid) && isNum(v.atSec) &&
  ((v.kind === 'event' && isStr(v.eventId)) || (v.kind === 'draw' && isStr(v.recordId)) ||
    (oneOf(v.kind, ['news', 'newsEnd', 'newsCancel'] as const) && oneOf(v.newsId, newsIds)));

function vRound(v: unknown): RoundProgress {
  const d = createRoundProgress();
  if (!isObj(v)) return d;
  const individual: Record<string, string> = {};
  if (isObj(v.individual)) for (const [k, val] of Object.entries(v.individual)) if (isStr(val) && /^\d+$/.test(k)) individual[k] = val;
  return {
    mode: oneOf(v.mode, ['index', 'individual'] as const) ? v.mode : d.mode,
    confirmedClosed: isBool(v.confirmedClosed) ? v.confirmedClosed : false,
    completed: isBool(v.completed) ? v.completed : false,
    indexRecordId: isStr(v.indexRecordId) ? v.indexRecordId : null,
    individual,
  };
}

function vManual(v: unknown): ManualPrices {
  const d = defaultManualPrices();
  if (!isObj(v)) return d;
  for (const id of MATERIAL_IDS) if (oneOf(v[id], Object.keys(PRICE_MODES) as PriceMode[])) d[id] = v[id] as PriceMode;
  return d;
}

/** Validate an unknown blob into a complete game state. Throws only if it's not an object at all. */
export function sanitize(raw: unknown): PersistedGame {
  if (!isObj(raw) || raw.schema !== STATE_SCHEMA_VERSION) throw new Error('incompatible save');
  const d = defaultGame();
  const grade: Grade = oneOf(raw.grade, [4, 6] as const) ? raw.grade : d.grade;
  const rounds = Array.isArray(raw.rounds) ? raw.rounds.slice(0, ROUND_COUNT).map(vRound) : d.rounds;
  while (rounds.length < ROUND_COUNT) rounds.push(createRoundProgress());
  const awards = { ...d.awards };
  if (isObj(raw.awards)) for (const a of AWARD_IDS) if (isStr(raw.awards[a])) awards[a] = (raw.awards[a] as string).slice(0, 40);
  const memory = {} as Record<ShopItemId, number>;
  const trends = {} as Record<ShopItemId, Trend>;
  if (isObj(raw.priceMemory)) for (const id of SHOP_ITEM_IDS) if (isNum(raw.priceMemory[id])) memory[id] = raw.priceMemory[id] as number;
  if (isObj(raw.trends)) for (const id of SHOP_ITEM_IDS) if (oneOf(raw.trends[id], ['up', 'down'] as const)) trends[id] = raw.trends[id] as Trend;
  const rs = raw.spinState;
  const spinState = isObj(rs) && oneOf(rs.status, ['idle', 'spinning', 'revealed'] as const)
    ? { status: rs.status, recordId: isStr(rs.recordId) ? rs.recordId : null, review: isBool(rs.review) ? rs.review : false }
    : { ...d.spinState };
  const draws = arr(raw.draws, isDraw);
  if (spinState.status !== 'idle' && !draws.some((r) => r.uid === spinState.recordId)) Object.assign(spinState, d.spinState);
  const gi = isObj(raw.gachaInput) ? raw.gachaInput : {};
  return {
    schema: STATE_SCHEMA_VERSION,
    savedAt: isNum(raw.savedAt) ? raw.savedAt : 0,
    lang: oneOf(raw.lang, ['ko', 'id', 'both'] as LangMode[]) ? raw.lang : d.lang,
    grade,
    muted: isBool(raw.muted) ? raw.muted : d.muted,
    timer: vTimer(raw.timer),
    started: isBool(raw.started) ? raw.started : false,
    lastSec: intIn(raw.lastSec, 0, SEC_MAX) ? raw.lastSec : d.lastSec,
    executed: arr(raw.executed, isStr, 200),
    notices: arr(raw.notices, isNotice, 100),
    manualPrices: vManual(raw.manualPrices),
    activeNews: arr(raw.activeNews, isActiveNews, 20),
    newsSeq: isNum(raw.newsSeq) ? raw.newsSeq : 0,
    priceMemory: memory,
    trends,
    rounds,
    draws,
    spinState,
    selectedRound: intIn(raw.selectedRound, 1, ROUND_COUNT) ? raw.selectedRound : null,
    gachaInput: {
      student: intIn(gi.student, 1, GRADES[grade].students) ? gi.student : 1,
      gold: intIn(gi.gold, 1, 1000) ? gi.gold : 1,
    },
    tutorial: isObj(raw.tutorial) && isBool(raw.tutorial.open) && intIn(raw.tutorial.slide, 0, TUTORIAL_SLIDES - 1)
      ? { open: raw.tutorial.open, slide: raw.tutorial.slide }
      : d.tutorial,
    awards,
    awardsRevealed: arr(raw.awardsRevealed, (x): x is AwardId => oneOf(x, AWARD_IDS)),
    view: oneOf(raw.view, ['dashboard', 'awards'] as const) ? raw.view : 'dashboard',
    presentation: isBool(raw.presentation) ? raw.presentation : false,
    locked: isBool(raw.locked) ? raw.locked : false,
    uiScale: oneOf(raw.uiScale, UI_SCALES) ? raw.uiScale : 1,
    log: arr(raw.log, isLog, 60),
  };
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function getStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadGame(storage: StorageLike | null = getStorage()): { game: PersistedGame | null; corrupt: boolean } {
  if (!storage) return { game: null, corrupt: false };
  let text: string | null = null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return { game: null, corrupt: false };
  }
  if (!text) return { game: null, corrupt: false };
  try {
    return { game: sanitize(JSON.parse(text)), corrupt: false };
  } catch {
    return { game: null, corrupt: true };
  }
}

export function saveGame(game: PersistedGame, storage: StorageLike | null = getStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}

export function clearGame(storage: StorageLike | null = getStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
