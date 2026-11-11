import { useMemo } from 'react';
import { GRADES, nextPhaseTargetSec, type Grade } from '../data/gameConfig';
import { formatSec } from '../engine/timerEngine';
import { getAppStore } from '../store/gameStore';

/** Teacher actions that need confirmation dialogs. Shared by buttons and keyboard shortcuts. */
export function useTeacherActions() {
  return useMemo(() => {
    const st = () => getAppStore().getState();
    const lockedGuard = () => {
      if (st().locked) {
        st().toast('err_locked_controls', undefined, 'danger');
        return true;
      }
      return false;
    };
    return {
      nextPhase() {
        if (lockedGuard()) return;
        const target = nextPhaseTargetSec(st().sec);
        if (target === null) return;
        st().askConfirm({
          titleKey: 'confirmNextPhase_title',
          bodyKey: 'confirmNextPhase_body',
          params: { time: formatSec(target) },
          confirmKey: 'nextPhase',
          onConfirm: () => st().jumpNextPhase(),
        });
      },
      reset() {
        if (lockedGuard()) return;
        if (st().spinState.status === 'spinning') {
          st().toast('err_resetDuringSpin', undefined, 'danger');
          return;
        }
        st().askConfirm({
          titleKey: 'confirmReset1_title',
          bodyKey: 'confirmReset1_body',
          confirmKey: 'continueAction',
          danger: true,
          next: { titleKey: 'confirmReset2_title', bodyKey: 'confirmReset2_body', confirmKey: 'confirmResetBtn', danger: true },
          onConfirm: () => st().resetGame(),
        });
      },
      changeGrade(g: Grade) {
        const s = st();
        if (s.grade === g) return;
        if (lockedGuard()) return;
        if (s.spinState.status === 'spinning') {
          s.toast('err_gradeDuringSpin', undefined, 'danger');
          return;
        }
        if (!s.started && s.draws.length === 0) {
          s.setGrade(g);
          return;
        }
        s.askConfirm({
          titleKey: 'confirmGrade_title',
          bodyKey: 'confirmGrade_body',
          params: { students: GRADES[g].students },
          onConfirm: () => st().setGrade(g),
        });
      },
      toggleLock() {
        const s = st();
        if (!s.locked) {
          s.setLocked(true);
          return;
        }
        s.askConfirm({ titleKey: 'confirmUnlock_title', bodyKey: 'confirmUnlock_body', confirmKey: 'unlock', onConfirm: () => st().setLocked(false) });
      },
      toggleFullscreen() {
        try {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
        } catch {
          /* not available */
        }
      },
    };
  }, []);
}
