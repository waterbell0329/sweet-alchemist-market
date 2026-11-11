import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, ZOOM_MAX, contentZoom } from '../data/gameConfig';
import { createGameStore, isTaskNotice, type GameStore } from '../store/gameStore';
import { allPrices } from '../engine/marketEngine';
import type { StorageLike } from '../store/persistence';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let now = 0;
const clock = () => now;
/** Fixed sequence of uint32 values for deterministic draws. */
const rolls = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

function make(storage: StorageLike | null = null, random = rolls(50)) {
  return createGameStore({ clock, storage, random, autoSave: false, playSounds: false }) as GameStore;
}

/** Advance wall time with the clock running, ticking each second like the real loop. */
function run(store: GameStore, seconds: number) {
  for (let i = 0; i < seconds; i++) {
    now += 1000;
    store.getState().tick();
  }
}

const prices = (store: GameStore) => {
  const s = store.getState();
  return allPrices(s.manualPrices, s.activeNews);
};

beforeEach(() => {
  now = 1_000_000;
});

describe('game store — timeline', () => {
  it('starts at 75:00 in phase 1 with the tutorial open', () => {
    const store = make();
    const s = store.getState();
    expect(s.sec).toBe(4500);
    expect(s.tutorial.open).toBe(true);
    expect(s.lang).toBe('both');
  });

  it('pausing stops time', () => {
    const store = make();
    store.getState().start();
    run(store, 10);
    store.getState().pause();
    run(store, 100);
    expect(store.getState().sec).toBe(4490);
  });

  it('reaching 65:00 opens the market and closes round 1, in order', () => {
    const store = make();
    store.getState().start();
    run(store, 600);
    const s = store.getState();
    expect(s.sec).toBe(3900);
    expect(s.notices.map((n) => n.kind)).toEqual(['phase', 'roundClose']);
    expect(s.notices.every((n) => !n.skipped)).toBe(true);
  });

  it('a wall-clock gap (background tab) is applied in one tick with no drift', () => {
    const store = make();
    store.getState().start();
    now += 123_400;
    store.getState().tick();
    expect(store.getState().sec).toBe(4500 - 123);
  });

  it('jumping forward queues every skipped event; rewinding does not re-fire them', () => {
    const store = make();
    store.getState().jumpNextPhase(); // → 65:00
    store.getState().jumpNextPhase(); // → 15:00
    const s = store.getState();
    expect(s.sec).toBe(900);
    expect(s.executed).toHaveLength(14);
    expect(s.notices).toHaveLength(13);
    expect(s.notices.every((n) => n.skipped)).toBe(true);
    // cocoa (40:00–35:00) already expired inside the jump, so its popup is dropped; cheese stays active
    expect(s.notices.filter((n) => n.kind === 'news').map((n) => n.newsId)).toEqual(['cheeseShortage']);
    const count = s.executed.length;
    store.getState().adjust(+60); // rewind to 16:00
    store.getState().adjust(-60); // forward again through 15:00
    expect(store.getState().executed.length).toBe(count);
    expect(store.getState().notices).toHaveLength(13);
  });

  it('timer stops at 00:00 and fires the end event', () => {
    const store = make();
    store.getState().jumpTo(3);
    store.getState().start();
    run(store, 10);
    const s = store.getState();
    expect(s.sec).toBe(0);
    expect(s.timer.running).toBe(false);
    expect(s.notices[s.notices.length - 1]).toMatchObject({ kind: 'phase', phase: 'end' });
  });

  it('acknowledging a round-close notice confirms the deposit (closed → waiting)', () => {
    const store = make();
    store.getState().jumpTo(3900);
    const n = store.getState().notices.find((x) => x.kind === 'roundClose')!;
    expect(store.getState().rounds[0].confirmedClosed).toBe(false);
    store.getState().acknowledgeNotice(n.uid);
    expect(store.getState().rounds[0].confirmedClosed).toBe(true);
  });
});

describe('game store — economic news', () => {
  it('cocoa harvest fires at 40:00, sets cocoa to 1 and restores after 5 game minutes', () => {
    const store = make();
    store.getState().setPriceMode('kakao', 'shortage');
    store.getState().jumpTo(2401);
    store.getState().start();
    run(store, 1);
    expect(prices(store).kakao.price).toBe(1);
    expect(store.getState().trends.kakao).toBe('down');
    run(store, 299);
    expect(store.getState().sec).toBe(2101);
    expect(prices(store).kakao.price).toBe(1);
    run(store, 1);
    expect(prices(store).kakao.price).toBe(4); // back to the teacher's manual price
    expect(store.getState().trends.kakao).toBe('up');
  });

  it('pausing freezes the news duration', () => {
    const store = make();
    store.getState().jumpTo(3000);
    store.getState().triggerNews('visitingAlchemist');
    store.getState().start();
    run(store, 60);
    store.getState().pause();
    run(store, 600);
    expect(prices(store).recipeGacha.price).toBe(2);
    store.getState().start();
    run(store, 120);
    expect(prices(store).recipeGacha.price).toBe(3);
  });

  it('cheese shortage at 25:00 is queued after the investment notices and can be cancelled', () => {
    const store = make();
    store.getState().jumpTo(1501);
    store.getState().notices.forEach((n) => store.getState().acknowledgeNotice(n.uid));
    store.getState().start();
    run(store, 1);
    expect(store.getState().notices.map((n) => n.kind)).toEqual(['roundClose', 'roundDraw', 'news']);
    expect(prices(store).keju.price).toBe(4);
    const a = store.getState().activeNews.find((x) => x.newsId === 'cheeseShortage')!;
    store.getState().cancelNews(a.uid);
    expect(prices(store).keju.price).toBe(2);
    expect(store.getState().notices.some((n) => n.kind === 'news')).toBe(false);
  });

  it('final sale makes every material 1 coin and ends at 10:00', () => {
    const store = make();
    store.getState().jumpTo(700);
    store.getState().triggerNews('finalSale');
    expect(['susu', 'kakao', 'tepung', 'gula', 'keju'].every((m) => prices(store)[m as 'susu'].price === 1)).toBe(true);
    store.getState().jumpTo(600);
    expect(prices(store).susu.price).toBe(2);
    expect(store.getState().triggerNews('cocoaHarvest')).toBe(false); // market closed
  });
});

describe('game store — investment draws', () => {
  it('cannot draw before the draw time', () => {
    const store = make();
    expect(store.getState().spin({ round: 1 })).toMatchObject({ ok: false, reason: 'locked' });
  });

  it('index mode: one official draw per round, result fixed before the animation', () => {
    const store = make(null, rolls(95)); // jackpot
    store.getState().jumpTo(3300);
    const r = store.getState().spin({ round: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.record.outcomeId).toBe('jackpot');
    expect(r.record.payoutCoins).toBe(15);
    expect(store.getState().spin({ round: 1 })).toMatchObject({ ok: false, reason: 'busy' });
    store.getState().revealSpin();
    store.getState().closeSpin();
    expect(store.getState().spin({ round: 1 })).toMatchObject({ ok: false, reason: 'locked' });
    expect(store.getState().rounds[0].completed).toBe(true);
    expect(store.getState().draws).toHaveLength(1);
  });

  it('individual mode: validates input, warns on duplicates, voids only with explicit overwrite', () => {
    const store = make(null, rolls(40, 70)); // interest, then big win
    store.getState().jumpTo(2700);
    expect(store.getState().setRoundMode(2, 'individual')).toBe('ok');
    store.getState().setGachaInput({ student: 23, gold: 2 });
    expect(store.getState().spin({ round: 2 })).toMatchObject({ ok: false, reason: 'student', error: 'tooLarge' });
    store.getState().setGachaInput({ student: 7, gold: 0 });
    expect(store.getState().spin({ round: 2 })).toMatchObject({ ok: false, reason: 'gold', error: 'tooSmall' });
    store.getState().setGachaInput({ student: 7, gold: 2 });
    const first = store.getState().spin({ round: 2 });
    expect(first.ok && first.record.payoutCoins).toBe(12);
    store.getState().revealSpin();
    store.getState().closeSpin();
    expect(store.getState().gachaInput).toEqual({ student: 8, gold: 1 });
    store.getState().setGachaInput({ student: 7, gold: 2 });
    expect(store.getState().spin({ round: 2 })).toMatchObject({ ok: false, reason: 'duplicate' });
    const again = store.getState().spin({ round: 2, overwrite: true });
    expect(again.ok && again.record.outcomeId).toBe('bigWin');
    const draws = store.getState().draws;
    expect(draws.map((d) => d.voided)).toEqual([true, false]);
  });

  it('switching mode after an official result requires confirmation and voids old results', () => {
    const store = make();
    store.getState().jumpTo(3300);
    store.getState().spin({ round: 1 });
    store.getState().revealSpin();
    store.getState().closeSpin();
    expect(store.getState().setRoundMode(1, 'individual')).toBe('needsConfirm');
    expect(store.getState().setRoundMode(1, 'individual', true)).toBe('ok');
    expect(store.getState().draws[0].voided).toBe(true);
    expect(store.getState().rounds[0].completed).toBe(false);
  });

  it('grade cannot change mid-spin; changing it later keeps time and draws', () => {
    const store = make();
    store.getState().jumpTo(3300);
    store.getState().spin({ round: 1 });
    expect(store.getState().setGrade(6)).toBe(false);
    store.getState().revealSpin();
    store.getState().closeSpin();
    expect(store.getState().setGrade(6)).toBe(true);
    expect(store.getState().sec).toBe(3300);
    expect(store.getState().draws).toHaveLength(1);
  });
});

describe('game store — persistence', () => {
  it('restores the saved class paused, without fast-forwarding closed-browser time', () => {
    const storage = new MemoryStorage();
    const a = createGameStore({ clock, storage, autoSave: true, playSounds: false }) as GameStore;
    a.getState().setLang('id');
    a.getState().setGrade(6);
    a.getState().start();
    run(a, 125);
    a.flush!();
    now += 3_600_000; // browser closed for an hour
    const b = make(storage);
    const s = b.getState();
    expect(s.timer.running).toBe(false);
    expect(s.sec).toBe(4500 - 125);
    expect(s.lang).toBe('id');
    expect(s.grade).toBe(6);
    expect(s.toasts[0].key).toBe('toastRestored');
  });

  it('a spin interrupted by refresh keeps its committed result', () => {
    const storage = new MemoryStorage();
    const a = createGameStore({ clock, storage, random: rolls(10), autoSave: true, playSounds: false }) as GameStore;
    a.getState().jumpTo(3300);
    const r = a.getState().spin({ round: 1 });
    a.flush!();
    const b = make(storage, rolls(99));
    expect(b.getState().spinState).toMatchObject({ status: 'revealed', recordId: r.ok ? r.record.uid : '' });
    expect(b.getState().draws[0].outcomeId).toBe('bankrupt');
  });

  it('corrupt storage falls back to a fresh game', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const s = make(storage).getState();
    expect(s.sec).toBe(4500);
    expect(s.toasts[0].key).toBe('toastCorrupt');
  });

  it('reset keeps language/grade/mute but clears the game', () => {
    const store = make();
    store.getState().setLang('ko');
    store.getState().jumpTo(3300);
    store.getState().spin({ round: 1 });
    store.getState().revealSpin();
    store.getState().closeSpin();
    store.getState().resetGame();
    const s = store.getState();
    expect(s.lang).toBe('ko');
    expect(s.sec).toBe(4500);
    expect(s.draws).toHaveLength(0);
    expect(s.notices).toHaveLength(0);
  });
});

describe('game store — screens', () => {
  it('starts on market and switches one screen at a time', () => {
    const st = make();
    expect(st.getState().screen).toBe('market');
    st.getState().setScreen('craft');
    expect(st.getState().screen).toBe('craft');
    st.getState().setScreen('invest');
    expect(st.getState().screen).toBe('invest');
  });
  it('splits notices: round events are teacher tasks, news/phase are not', () => {
    const st = make();
    st.getState().jumpTo(3900);
    const kinds = st.getState().notices.map((n) => [n.kind, isTaskNotice(n)]);
    expect(kinds).toContainEqual(['roundClose', true]);
    expect(kinds).toContainEqual(['phase', false]);
  });
});

describe('game store — content size', () => {
  it('steps through the size levels, stops at both ends, and survives a reset', () => {
    const st = make();
    expect(st.getState().uiScale).toBe(1);
    expect(st.getState().stepScale(-1)).toBe(true);
    expect(st.getState().stepScale(-1)).toBe(false);
    expect(st.getState().uiScale).toBe(0.9);
    for (let i = 0; i < 4; i++) st.getState().stepScale(1);
    expect(st.getState().uiScale).toBe(1.5);
    expect(st.getState().stepScale(1)).toBe(false);
    st.getState().resetGame();
    expect(st.getState().uiScale).toBe(1.5);
  });

  it('caps each screen where it still fits; the bank starts larger', () => {
    expect(contentZoom('market', 1)).toBe(1);
    expect(contentZoom('invest', 1)).toBeCloseTo(1.3);
    expect(contentZoom('craft', 1.5)).toBe(ZOOM_MAX.craft);
    expect(contentZoom('invest', 1.5)).toBe(ZOOM_MAX.invest);
    expect(contentZoom('market', 0.9)).toBe(0.9);
  });
});

describe('game store — event flow', () => {
  it('[later] on a round task parks it in the strip; [deposit] confirms the round', () => {
    const st = make();
    st.getState().start();
    run(st, 600); // 75:00 → 65:00: market opens and round 1 closes, both live
    const close = st.getState().notices.find((n) => n.kind === 'roundClose')!;
    expect(close.skipped).toBe(false);
    st.getState().deferNotice(close.uid);
    expect(st.getState().notices.find((n) => n.uid === close.uid)!.skipped).toBe(true);
    st.getState().acknowledgeNotice(close.uid);
    expect(st.getState().rounds[0].confirmedClosed).toBe(true);
  });

  it('the draw button jumps to the bank screen with that round selected', () => {
    const st = make();
    st.getState().setScreen('market');
    st.getState().jumpTo(3300);
    const draw = st.getState().notices.find((n) => n.kind === 'roundDraw')!;
    st.getState().acknowledgeNotice(draw.uid, 'gotoGacha');
    expect(st.getState().screen).toBe('invest');
    expect(st.getState().selectedRound).toBe(1);
    expect(st.getState().gachaStage).toBe(true);
  });

  it('the full-screen gacha closes after the class-wide result, but stays for one-by-one draws', () => {
    const st = make();
    st.getState().jumpTo(3300);
    st.getState().setGachaStage(true);
    st.getState().spin({ round: 1 });
    st.getState().revealSpin();
    st.getState().closeSpin();
    expect(st.getState().gachaStage).toBe(false);

    st.getState().jumpTo(2700);
    st.getState().setRoundMode(2, 'individual');
    st.getState().setGachaStage(true);
    st.getState().spin({ round: 2 });
    st.getState().revealSpin();
    st.getState().closeSpin();
    expect(st.getState().gachaStage).toBe(true);
  });
});
