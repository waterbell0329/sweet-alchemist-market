import { useEffect } from 'react';
import { getAppStore, isTaskNotice, useGame } from '../store/gameStore';

const IDLE_MS = 20_000;

/** With a teacher task pending, move to the bank only after 20s without any input (and never while paused). */
export function useAutoFollow() {
  const pending = useGame((s) => s.notices.some(isTaskNotice));
  useEffect(() => {
    if (!pending) return;
    let id = 0;
    const arm = () => {
      window.clearTimeout(id);
      id = window.setTimeout(() => {
        const s = getAppStore().getState();
        if (s.timer.running && s.screen !== 'invest') s.setScreen('invest');
        else arm();
      }, IDLE_MS);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, [pending]);
}
