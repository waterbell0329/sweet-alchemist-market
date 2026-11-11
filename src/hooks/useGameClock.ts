import { useEffect } from 'react';
import { getAppStore } from '../store/gameStore';

/** Drives the store's tick. The interval only *samples* the wall-clock-anchored timer. */
export function useGameClock() {
  useEffect(() => {
    const store = getAppStore();
    const tick = () => store.getState().tick();
    const id = window.setInterval(tick, 200);
    const onVis = () => {
      tick();
      if (document.visibilityState === 'hidden') store.flush?.();
    };
    const onHide = () => store.flush?.();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);
}
