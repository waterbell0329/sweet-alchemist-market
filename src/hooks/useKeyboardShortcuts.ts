import { useEffect } from 'react';
import { TUTORIAL_SLIDES } from '../data/gameConfig';
import { getAppStore } from '../store/gameStore';
import { useTeacherActions } from './useTeacherActions';

export function useKeyboardShortcuts() {
  const actions = useTeacherActions();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = getAppStore().getState();
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (s.confirm) {
        if (e.key === 'Escape') s.askConfirm(null);
        return; // dialog buttons handle Enter themselves
      }
      if (e.key === 'Escape') {
        if (s.shortcutsOpen) s.setShortcuts(false);
        else if (s.newsMenuOpen) s.setNewsMenu(false);
        else if (s.awardShowing) s.closeAwardShow();
        else if (s.tutorial.open) s.setTutorial({ open: false });
        else if (s.gachaStage && s.spinState.status === 'idle') s.setGachaStage(false);
        return;
      }
      if (typing) return;

      // Buttons already react to Enter/Space when focused; don't double-fire.
      const onButton = target?.tagName === 'BUTTON';
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (s.tutorial.open && !s.notices.length) {
        if (key === 'ArrowRight') return void s.setTutorial({ slide: Math.min(TUTORIAL_SLIDES - 1, s.tutorial.slide + 1) });
        if (key === 'ArrowLeft') return void s.setTutorial({ slide: Math.max(0, s.tutorial.slide - 1) });
      }

      switch (key) {
        case ' ':
          if (onButton) return;
          e.preventDefault();
          s.toggleRun();
          break;
        case 'Enter': {
          if (onButton) return;
          if (s.spinState.status === 'revealed') s.closeSpin();
          else if (s.awardShowing) s.closeAwardShow();
          else window.dispatchEvent(new Event('sam:primary'));
          break;
        }
        case '+':
        case '=':
          s.adjust(60);
          break;
        case '-':
        case '_':
          s.adjust(-60);
          break;
        case 'n':
          actions.nextPhase();
          break;
        case 's':
          window.dispatchEvent(new Event('sam:spin'));
          break;
        case 'l':
          s.cycleLang();
          break;
        case 'm':
          s.setMuted(!s.muted);
          break;
        case 'f':
          actions.toggleFullscreen();
          break;
        case 'h':
          s.togglePresentation();
          break;
        case '1':
          s.setScreen('market');
          break;
        case '2':
          s.setScreen('craft');
          break;
        case '3':
          s.setScreen('invest');
          break;
        case '[':
          s.stepScale(-1);
          break;
        case ']':
          s.stepScale(1);
          break;
        case 't':
          s.setTutorial({ open: !s.tutorial.open });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);
}
