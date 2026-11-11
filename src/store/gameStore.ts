import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { GRADES, ROUND_SCHEDULE, UI_SCALES, nextPhaseTargetSec, type ScreenId, phaseFromRemainingSec, type Grade } from '../data/gameConfig';
import { BEEP_TARGETS, SCHEDULE, type NewsId } from '../data/events';
import { type MaterialId, type PriceMode } from '../data/recipes';
import { findCrossedEvents, shouldBeep } from '../engine/eventScheduler';
import {
  canDraw,
  cryptoUint32,
  drawOutcome,
  payoutCoins,
  roundStatus,
  validateGold,
  validateStudent,
  type InputError,
  type Uint32Source,
} from '../engine/investmentEngine';
import { activateNews, allPrices, computeTrends, expireNews } from '../engine/marketEngine';
import { sound } from '../engine/soundEngine';
import { getRemainingMs, pauseTimer, setRemaining, startTimer, toDisplaySec } from '../engine/timerEngine';
import { nextLangMode, type LangMode, type Params, type TKey } from '../i18n';
import { defaultGame, getStorage, loadGame, saveGame, type StorageLike } from './persistence';
import type { AwardId, ConfirmRequest, DrawRecord, LogEntry, Notice, PersistedGame, Toast } from './types';

export type Screen = ScreenId;

export interface Transient {
  /** Current display second (remaining). */
  sec: number;
  toasts: Toast[];
  confirm: ConfirmRequest | null;
  newsMenuOpen: boolean;
  /** Full-screen gacha machine (opens by itself when a draw time arrives). Not persisted. */
  gachaStage: boolean;
  /** Which dashboard screen is shown (one at a time). Not persisted: a reload starts on the market. */
  screen: Screen;
  shortcutsOpen: boolean;
  awardShowing: AwardId | null;
  /** Bumped when the gacha panel should flash (e.g. teacher jumped there from a notice). */
  gachaFocus: number;
  /** Notice the teacher postponed ("later"); hidden until a new notice arrives or the bell is pressed. */
  snoozedNotice: string | null;
}

export type SpinResult =
  | { ok: true; record: DrawRecord }
  | { ok: false; reason: 'busy' | 'locked' | 'alreadyDrawn' | 'duplicate'; existing?: DrawRecord }
  | { ok: false; reason: 'student' | 'gold'; error: InputError };

export interface Actions {
  tick(): void;
  start(): void;
  pause(): void;
  toggleRun(): void;
  adjust(deltaSec: number): boolean;
  jumpTo(sec: number): void;
  jumpNextPhase(): boolean;
  resetGame(): void;
  setLang(l: LangMode): void;
  cycleLang(): void;
  setGrade(g: Grade): boolean;
  setMuted(m: boolean): void;
  setPriceMode(item: MaterialId, mode: PriceMode): boolean;
  triggerNews(id: NewsId): boolean;
  cancelNews(uid: string): void;
  acknowledgeNotice(uid: string, action?: 'gotoGacha' | 'openAwards'): void;
  selectRound(r: number | null): void;
  setRoundMode(r: number, mode: 'index' | 'individual', force?: boolean): 'ok' | 'needsConfirm' | 'busy';
  setGachaInput(p: Partial<{ student: number; gold: number }>): void;
  spin(opts: { round: number; overwrite?: boolean }): SpinResult;
  revealSpin(): void;
  closeSpin(): void;
  reviewRecord(uid: string): void;
  completeRound(r: number): void;
  setTutorial(p: Partial<PersistedGame['tutorial']>): void;
  setAward(id: AwardId, value: string): void;
  revealAward(id: AwardId): boolean;
  closeAwardShow(): void;
  setView(v: PersistedGame['view']): void;
  setScreen(s: Screen): void;
  togglePresentation(): void;
  /** Step content zoom up (+1) or down (−1) through UI_SCALES; returns false at either end. */
  stepScale(dir: 1 | -1): boolean;
  setLocked(l: boolean): void;
  toast(key: TKey, params?: Params, tone?: Toast['tone'], keyParams?: Record<string, TKey>): void;
  dismissToast(uid: string): void;
  askConfirm(req: ConfirmRequest | null): void;
  setNewsMenu(open: boolean): void;
  setGachaStage(open: boolean): void;
  setShortcuts(open: boolean): void;
  snoozeNotice(uid: string | null): void;
  /** Teacher pressed [later] on a round task: it leaves the big card and waits in the bottom strip. */
  deferNotice(uid: string): void;
}

export type GameState = PersistedGame & Transient & Actions;

export interface StoreOptions {
  clock?: () => number;
  storage?: StorageLike | null;
  random?: Uint32Source;
  autoSave?: boolean;
  playSounds?: boolean;
}

let uidCounter = 0;
export const makeUid = (prefix = 'u'): string =>
  `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const PERSIST_KEYS: (keyof PersistedGame)[] = [
  'schema', 'savedAt', 'lang', 'grade', 'muted', 'timer', 'started', 'lastSec', 'executed', 'notices', 'manualPrices',
  'activeNews', 'newsSeq', 'priceMemory', 'trends', 'rounds', 'draws', 'spinState', 'selectedRound', 'gachaInput', 'tutorial',
  'awards', 'awardsRevealed', 'view', 'presentation', 'locked', 'uiScale', 'log',
];

export function pickPersisted(s: GameState | PersistedGame): PersistedGame {
  const out = {} as Record<string, unknown>;
  for (const k of PERSIST_KEYS) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as PersistedGame;
}

/* ------------------------------------------------------------------------------------ */
/* Pure clock application: run scheduled events crossed between lastSec and newSec,     */
/* expire news, and refresh price memory. Used by live ticks and by manual time jumps.  */
/* ------------------------------------------------------------------------------------ */
export function applyClock(s: PersistedGame, newSec: number, live: boolean): Partial<PersistedGame> {
  const crossed = findCrossedEvents(SCHEDULE, s.lastSec, newSec, s.executed);
  let { activeNews, newsSeq } = s;
  const executed = [...s.executed];
  let notices = [...s.notices];
  const log: LogEntry[] = [...s.log];
  let rounds = s.rounds;
  let selectedRound = s.selectedRound;
  for (const e of crossed) {
    executed.push(e.id);
    const base = { uid: makeUid('n'), atSec: e.remainingSeconds, skipped: !live };
    switch (e.type) {
      case 'phase':
        notices.push({ ...base, kind: 'phase', phase: e.payload.phase });
        log.push({ uid: makeUid('l'), kind: 'event', eventId: e.id, atSec: e.remainingSeconds });
        break;
      case 'roundClose':
        notices.push({ ...base, kind: 'roundClose', round: e.payload.round });
        log.push({ uid: makeUid('l'), kind: 'event', eventId: e.id, atSec: e.remainingSeconds });
        break;
      case 'roundDraw':
        notices.push({ ...base, kind: 'roundDraw', round: e.payload.round });
        log.push({ uid: makeUid('l'), kind: 'event', eventId: e.id, atSec: e.remainingSeconds });
        // A round can't be drawn before its deposits are closed; reaching the draw time implies it.
        rounds = rounds.map((r, i) => (i === e.payload.round - 1 ? { ...r, confirmedClosed: true } : r));
        selectedRound = null;
        break;
      case 'news': {
        newsSeq += 1;
        const res = activateNews(activeNews, e.payload.newsId, e.remainingSeconds, newsSeq, makeUid('a'));
        if (res) {
          activeNews = res.active;
          notices.push({ ...base, kind: 'news', newsId: e.payload.newsId, activeUid: res.entry.uid });
          log.push({ uid: makeUid('l'), kind: 'news', newsId: e.payload.newsId, atSec: e.remainingSeconds });
        }
        break;
      }
    }
  }
  const exp = expireNews(activeNews, newSec);
  if (exp.expired.length) {
    activeNews = exp.active;
    const gone = new Set(exp.expired.map((x) => x.uid));
    notices = notices.filter((n) => !(n.kind === 'news' && n.activeUid && gone.has(n.activeUid)));
    for (const x of exp.expired) log.push({ uid: makeUid('l'), kind: 'newsEnd', newsId: x.newsId, atSec: x.expiresAtSec ?? newSec });
  }
  const trend = computeTrends(s.priceMemory, s.trends, allPrices(s.manualPrices, activeNews));
  return {
    lastSec: newSec,
    executed,
    notices,
    activeNews,
    newsSeq,
    rounds,
    selectedRound,
    log: log.slice(-60),
    priceMemory: trend.memory,
    trends: trend.trends,
  };
}

/** Teacher-action notices live in the bottom strip; everything else is a banner / short cinematic. */
export const isTaskNotice = (n: Pick<Notice, 'kind'>): boolean => n.kind === 'roundClose' || n.kind === 'roundDraw';

/** Round shown in the gacha machine: teacher's pick, else the first drawable, else the next upcoming draw. */
export function activeGachaRound(s: Pick<PersistedGame, 'selectedRound' | 'rounds'> & { sec: number }): number {
  if (s.selectedRound) return s.selectedRound;
  const statuses = ROUND_SCHEDULE.map((c, i) => roundStatus(c, s.sec, s.rounds[i]));
  const drawable = statuses.findIndex((st) => canDraw(st));
  if (drawable >= 0) return drawable + 1;
  const pending = ROUND_SCHEDULE.findIndex((c, i) => s.sec > c.draw && !s.rounds[i].completed);
  if (pending >= 0) return pending + 1;
  return ROUND_SCHEDULE.length;
}

export function createGameStore(opts: StoreOptions = {}): StoreApi<GameState> {
  const clock = opts.clock ?? (() => Date.now());
  const storage = opts.storage === undefined ? getStorage() : opts.storage;
  const random = opts.random ?? cryptoUint32;
  const play = (n: Parameters<typeof sound.play>[0]) => {
    if (opts.playSounds !== false) sound.play(n);
  };

  // ---------- restore ----------
  const loaded = loadGame(storage);
  let initial: PersistedGame = loaded.game ?? defaultGame();
  const restored = !!loaded.game && loaded.game.started;
  if (loaded.game) {
    // Safety: always come back paused at the moment of the last save. Time that passed while
    // the browser was closed is NOT fast-forwarded.
    const rem = getRemainingMs(initial.timer, initial.savedAt || clock());
    initial = { ...initial, timer: setRemaining({ ...initial.timer, running: false }, rem, clock()) };
    if (initial.spinState.status === 'spinning') initial = { ...initial, spinState: { ...initial.spinState, status: 'revealed' } };
  }
  const initSec = toDisplaySec(initial.timer.anchorRemainingMs);
  initial = { ...initial, ...applyClock(initial, initSec, false) };
  sound.setMuted(initial.muted);

  const store = createStore<GameState>()((set, get) => {
    const toast = (key: TKey, params?: Params, tone: Toast['tone'] = 'info', keyParams?: Record<string, TKey>) => {
      const t: Toast = { uid: makeUid('t'), key, params, tone, keyParams };
      set((s) => ({ toasts: [...s.toasts.slice(-3), t] }));
    };
    const guardLocked = (): boolean => {
      if (get().locked) {
        toast('err_locked_controls', undefined, 'danger');
        return true;
      }
      return false;
    };
    /** Move the clock to an absolute remaining-ms, processing any crossed events. */
    const moveTo = (remainingMs: number) => {
      const s = get();
      const now = clock();
      const timer = setRemaining(s.timer, remainingMs, now);
      const sec = toDisplaySec(getRemainingMs(timer, now));
      set({ timer, sec, ...applyClock(s, sec, false) });
    };
    const refreshPrices = (patch: Partial<PersistedGame>) => {
      const s = { ...get(), ...patch };
      const trend = computeTrends(s.priceMemory, s.trends, allPrices(s.manualPrices, s.activeNews));
      set({ ...patch, priceMemory: trend.memory, trends: trend.trends });
    };

    return {
      ...initial,
      sec: initSec,
      toasts: restored ? [{ uid: makeUid('t'), key: 'toastRestored', tone: 'info' }] : loaded.corrupt ? [{ uid: makeUid('t'), key: 'toastCorrupt', tone: 'danger' }] : [],
      confirm: null,
      newsMenuOpen: false,
      gachaStage: false,
      screen: 'market' as Screen,
      shortcutsOpen: false,
      awardShowing: null,
      gachaFocus: 0,
      snoozedNotice: null,

      tick() {
        const s = get();
        const now = clock();
        let timer = s.timer;
        const rem = getRemainingMs(timer, now);
        if (timer.running && rem <= 0) timer = pauseTimer(timer, now);
        const sec = toDisplaySec(rem);
        if (sec === s.sec && timer === s.timer) return;
        const patch = applyClock(s, sec, true);
        if (s.timer.running && sec < s.sec && shouldBeep(BEEP_TARGETS, sec)) play('beep');
        set({ ...patch, timer, sec });
      },
      start() {
        const s = get();
        const now = clock();
        if (getRemainingMs(s.timer, now) <= 0) return;
        set({ timer: startTimer(s.timer, now), started: true });
      },
      pause() {
        set((s) => ({ timer: pauseTimer(s.timer, clock()) }));
      },
      toggleRun() {
        if (get().timer.running) get().pause();
        else get().start();
      },
      adjust(deltaSec) {
        if (guardLocked()) return false;
        const s = get();
        moveTo(getRemainingMs(s.timer, clock()) + deltaSec * 1000);
        return true;
      },
      jumpTo(sec) {
        moveTo(sec * 1000);
      },
      jumpNextPhase() {
        if (guardLocked()) return false;
        const target = nextPhaseTargetSec(get().sec);
        if (target === null) return false;
        moveTo(target * 1000);
        return true;
      },
      resetGame() {
        const s = get();
        if (s.spinState.status === 'spinning') {
          toast('err_resetDuringSpin', undefined, 'danger');
          return;
        }
        const fresh = defaultGame({ lang: s.lang, grade: s.grade, muted: s.muted, uiScale: s.uiScale });
        const sec = toDisplaySec(fresh.timer.anchorRemainingMs);
        set({ ...fresh, ...applyClock(fresh, sec, false), sec, confirm: null, awardShowing: null, newsMenuOpen: false, gachaStage: false });
      },
      setLang(lang) {
        set({ lang });
      },
      cycleLang() {
        set((s) => ({ lang: nextLangMode(s.lang) }));
      },
      setGrade(grade) {
        const s = get();
        if (s.spinState.status === 'spinning') {
          toast('err_gradeDuringSpin', undefined, 'danger');
          return false;
        }
        if (guardLocked()) return false;
        const max = GRADES[grade].students;
        set({ grade, gachaInput: { ...s.gachaInput, student: Math.min(s.gachaInput.student, max) } });
        return true;
      },
      setMuted(muted) {
        sound.setMuted(muted);
        set({ muted });
      },
      setPriceMode(item, mode) {
        if (guardLocked()) return false;
        refreshPrices({ manualPrices: { ...get().manualPrices, [item]: mode } });
        return true;
      },
      triggerNews(newsId) {
        if (guardLocked()) return false;
        const s = get();
        if (phaseFromRemainingSec(s.sec) === 4) {
          toast('newsUnavailable', undefined, 'danger');
          return false;
        }
        const seq = s.newsSeq + 1;
        const res = activateNews(s.activeNews, newsId, s.sec, seq, makeUid('a'));
        if (!res) {
          toast('newsUnavailable', undefined, 'danger');
          return false;
        }
        const notice: Notice = { uid: makeUid('n'), kind: 'news', newsId, activeUid: res.entry.uid, atSec: s.sec, skipped: false, manual: true };
        refreshPrices({
          activeNews: res.active,
          newsSeq: seq,
          notices: [...s.notices.filter((n) => !(n.kind === 'news' && n.newsId === newsId)), notice],
          log: [...s.log, { uid: makeUid('l'), kind: 'news' as const, newsId, atSec: s.sec }].slice(-60),
        });
        return true;
      },
      cancelNews(uid) {
        const s = get();
        const target = s.activeNews.find((a) => a.uid === uid);
        if (!target) return;
        refreshPrices({
          activeNews: s.activeNews.filter((a) => a.uid !== uid),
          notices: s.notices.filter((n) => n.activeUid !== uid),
          log: [...s.log, { uid: makeUid('l'), kind: 'newsCancel' as const, newsId: target.newsId, atSec: s.sec }].slice(-60),
        });
        toast('newsCancelled', undefined, 'info', { title: `news_${target.newsId}_title` as TKey });
      },
      acknowledgeNotice(uid, action) {
        const s = get();
        const n = s.notices.find((x) => x.uid === uid);
        if (!n) return;
        const patch: Partial<GameState> = { notices: s.notices.filter((x) => x.uid !== uid) };
        if (n.kind === 'roundClose' && n.round) {
          patch.rounds = s.rounds.map((r, i) => (i === n.round! - 1 ? { ...r, confirmedClosed: true } : r));
          toast('toastConfirmed', { round: n.round }, 'success');
        }
        if (action === 'gotoGacha' && n.round) {
          patch.selectedRound = n.round;
          patch.gachaFocus = s.gachaFocus + 1;
          patch.view = 'dashboard';
          patch.screen = 'invest';
          patch.gachaStage = true;
        }
        if (action === 'openAwards') patch.view = 'awards';
        set(patch);
      },
      selectRound(r) {
        set({ selectedRound: r });
      },
      setRoundMode(r, mode, force) {
        const s = get();
        if (s.spinState.status === 'spinning') return 'busy';
        const rp = s.rounds[r - 1];
        if (rp.mode === mode) return 'ok';
        const hasResults = rp.indexRecordId !== null || Object.keys(rp.individual).length > 0;
        if (hasResults && !force) return 'needsConfirm';
        const voidIds = new Set([rp.indexRecordId, ...Object.values(rp.individual)].filter(Boolean) as string[]);
        set({
          rounds: s.rounds.map((x, i) => (i === r - 1 ? { ...x, mode, indexRecordId: null, individual: {}, completed: false } : x)),
          draws: s.draws.map((d) => (voidIds.has(d.uid) ? { ...d, voided: true } : d)),
        });
        return 'ok';
      },
      setGachaInput(p) {
        set((s) => ({ gachaInput: { ...s.gachaInput, ...p } }));
      },
      spin({ round, overwrite }) {
        const s = get();
        if (s.spinState.status !== 'idle') return { ok: false, reason: 'busy' };
        const cfg = ROUND_SCHEDULE[round - 1];
        const rp = s.rounds[round - 1];
        if (!cfg || !rp || !canDraw(roundStatus(cfg, s.sec, rp))) return { ok: false, reason: 'locked' };
        const individual = rp.mode === 'individual';
        let gold = 1;
        let studentNumber: number | null = null;
        let voidUid: string | null = null;
        if (individual) {
          const se = validateStudent(s.gachaInput.student, s.grade);
          if (se) return { ok: false, reason: 'student', error: se };
          const ge = validateGold(s.gachaInput.gold);
          if (ge) return { ok: false, reason: 'gold', error: ge };
          gold = s.gachaInput.gold;
          studentNumber = s.gachaInput.student;
          const prev = rp.individual[String(studentNumber)];
          if (prev) {
            if (!overwrite) return { ok: false, reason: 'duplicate', existing: s.draws.find((d) => d.uid === prev) };
            voidUid = prev;
          }
        } else if (rp.indexRecordId) {
          return { ok: false, reason: 'alreadyDrawn', existing: s.draws.find((d) => d.uid === rp.indexRecordId) };
        }
        // The result is fixed here, before any animation runs.
        const { roll, outcome } = drawOutcome(random);
        const record: DrawRecord = {
          uid: makeUid('d'),
          round,
          mode: rp.mode,
          studentNumber,
          investmentGold: gold,
          outcomeId: outcome.id,
          roll,
          payoutCoins: payoutCoins(outcome.id, gold),
          timestamp: clock(),
          atSec: s.sec,
          voided: false,
        };
        const nextRp = individual
          ? { ...rp, individual: { ...rp.individual, [String(studentNumber)]: record.uid } }
          : { ...rp, indexRecordId: record.uid, completed: true };
        set({
          rounds: s.rounds.map((x, i) => (i === round - 1 ? nextRp : x)),
          draws: [...s.draws.map((d) => (d.uid === voidUid ? { ...d, voided: true } : d)), record],
          spinState: { status: 'spinning', recordId: record.uid, review: false },
          selectedRound: round,
          log: [...s.log, { uid: makeUid('l'), kind: 'draw' as const, recordId: record.uid, atSec: s.sec }].slice(-60),
        });
        return { ok: true, record };
      },
      revealSpin() {
        set((s) => (s.spinState.status === 'spinning' ? { spinState: { ...s.spinState, status: 'revealed' } } : {}));
      },
      closeSpin() {
        const s = get();
        if (s.spinState.status !== 'revealed') return;
        const rec = s.draws.find((d) => d.uid === s.spinState.recordId);
        const patch: Partial<GameState> = { spinState: { status: 'idle', recordId: null, review: false } };
        if (rec && rec.mode === 'individual' && !s.spinState.review) {
          const max = GRADES[s.grade].students;
          const done = s.rounds[rec.round - 1].individual;
          let next = rec.studentNumber ?? 0;
          for (let i = 0; i < max; i++) {
            next = (next % max) + 1;
            if (!done[String(next)]) break;
          }
          patch.gachaInput = { student: next, gold: 1 };
        }
        // One shared draw for the class: once its result is confirmed, the full-screen gacha steps aside.
        if (rec && rec.mode === 'index' && !s.spinState.review) patch.gachaStage = false;
        set(patch);
      },
      reviewRecord(uid) {
        const s = get();
        if (s.spinState.status !== 'idle' || !s.draws.some((d) => d.uid === uid)) return;
        set({ spinState: { status: 'revealed', recordId: uid, review: true } });
      },
      completeRound(r) {
        set((s) => ({ rounds: s.rounds.map((x, i) => (i === r - 1 ? { ...x, completed: true } : x)), selectedRound: null }));
      },
      setTutorial(p) {
        set((s) => ({ tutorial: { ...s.tutorial, ...p } }));
      },
      setAward(id, value) {
        set((s) => ({ awards: { ...s.awards, [id]: value.slice(0, 40) } }));
      },
      revealAward(id) {
        const s = get();
        if (!s.awards[id].trim()) {
          toast('winnerEmpty', undefined, 'danger');
          return false;
        }
        set({ awardShowing: id, awardsRevealed: s.awardsRevealed.includes(id) ? s.awardsRevealed : [...s.awardsRevealed, id] });
        return true;
      },
      closeAwardShow() {
        set({ awardShowing: null });
      },
      setView(view) {
        set({ view });
      },
      setScreen(screen) {
        set({ screen });
      },
      stepScale(dir) {
        const i = UI_SCALES.indexOf(get().uiScale) + dir;
        if (i < 0 || i >= UI_SCALES.length) return false;
        set({ uiScale: UI_SCALES[i] });
        return true;
      },
      togglePresentation() {
        set((s) => ({ presentation: !s.presentation }));
      },
      setLocked(locked) {
        set({ locked });
      },
      toast,
      dismissToast(uid) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.uid !== uid) }));
      },
      askConfirm(confirm) {
        set({ confirm });
      },
      setNewsMenu(newsMenuOpen) {
        set({ newsMenuOpen });
      },
      setGachaStage(gachaStage) {
        set({ gachaStage });
      },
      setShortcuts(shortcutsOpen) {
        set({ shortcutsOpen });
      },
      snoozeNotice(snoozedNotice) {
        set({ snoozedNotice });
      },
      deferNotice(uid) {
        // Deferred tasks reuse the `skipped` flag: both mean "strip only, no big card".
        set((s) => ({ notices: s.notices.map((n) => (n.uid === uid ? { ...n, skipped: true } : n)) }));
      },
    };
  });

  // ---------- autosave (throttled) ----------
  if (opts.autoSave !== false && storage) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSnapshot: PersistedGame | null = null;
    const flush = () => {
      timer = null;
      const snap = pickPersisted(store.getState());
      // Avoid writes when nothing persisted changed (sec ticks alone are transient).
      // While the clock runs, save every flush so a refresh restores the latest second.
      if (!snap.timer.running && lastSnapshot && PERSIST_KEYS.every((k) => k === 'savedAt' || lastSnapshot![k] === snap[k])) return;
      lastSnapshot = snap;
      saveGame({ ...snap, savedAt: clock() }, storage);
    };
    store.subscribe(() => {
      if (!timer) timer = setTimeout(flush, 1000);
    });
    (store as StoreApi<GameState> & { flush?: () => void }).flush = () => {
      if (timer) clearTimeout(timer);
      lastSnapshot = null;
      flush();
    };
  }
  return store;
}

export type GameStore = StoreApi<GameState> & { flush?: () => void };

/* Singleton used by the app (tests create their own stores). */
let appStore: GameStore | null = null;
export function getAppStore(): GameStore {
  if (!appStore) appStore = createGameStore();
  return appStore;
}

export function useGame<T>(selector: (s: GameState) => T): T {
  return useStore(getAppStore(), selector);
}
