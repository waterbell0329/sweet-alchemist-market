import { LAYOUT, contentZoom, phaseFromRemainingSec } from './data/gameConfig';
import { useAudioUnlock } from './hooks/useAudio';
import { useGameClock } from './hooks/useGameClock';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStageScale } from './hooks/useStageScale';
import { isTaskNotice, useGame } from './store/gameStore';
import { useAutoFollow } from './hooks/useAutoFollow';
import { TaskStrip } from './components/TaskStrip';
import { AwardsScreen } from './components/AwardsScreen';
import { SideNav } from './components/SideNav';
import { GachaStage } from './components/GachaStage';
import { CraftingTree } from './components/CraftingTree';
import { EventTicker } from './components/EventTicker';
import { GachaResultModal } from './components/GachaResultModal';
import { Header } from './components/Header';
import { InvestmentPanel } from './components/InvestmentPanel';
import { MarketPanel } from './components/MarketPanel';
import { NewsMenu } from './components/NewsMenu';
import { NoticeHost } from './components/NoticeHost';
import { ConfirmDialog, ShortcutsDialog, ToastHost } from './components/Overlays';
import { TutorialModal } from './components/TutorialModal';

export default function App() {
  useGameClock();
  useKeyboardShortcuts();
  useAutoFollow();
  const audio = useAudioUnlock();
  const scale = useStageScale();
  const sec = useGame((s) => s.sec);
  const view = useGame((s) => s.view);
  const lang = useGame((s) => s.lang);
  const screen = useGame((s) => s.screen);
  const hasTask = useGame((s) => s.notices.some((n) => isTaskNotice(n) && n.skipped));
  const uiScale = useGame((s) => s.uiScale);
  const gachaStage = useGame((s) => s.gachaStage);
  const z = contentZoom(screen, uiScale);
  const mainH = 1080 - LAYOUT.top - (hasTask ? LAYOUT.bottomWithTask : LAYOUT.bottom);
  const phase = phaseFromRemainingSec(sec);

  return (
    <div className="stage-wrap">
      <div className={`stage ${phase === 3 ? 'phase-lastcall' : ''}`} style={{ transform: `scale(${scale})` }} lang={lang === 'ko' ? 'ko' : 'id'}>
        {phase === 3 && <div className="hazard pointer-events-none absolute inset-x-0 top-0 h-[8px]" aria-hidden />}
        <Header audio={audio} />
        {view === 'dashboard' ? (
          <>
            <SideNav />
            <main className="absolute overflow-hidden" style={{ left: LAYOUT.mainLeft, top: LAYOUT.top, width: LAYOUT.mainW, height: mainH }}>
              {/* Lay out at a smaller logical size, then scale up: everything grows together and still fits. */}
              <div style={{ width: LAYOUT.mainW / z, height: mainH / z, transform: `scale(${z})`, transformOrigin: '0 0' }}>
                {gachaStage ? null : screen === 'market' ? <MarketPanel /> : screen === 'craft' ? <CraftingTree w={LAYOUT.mainW / z} h={mainH / z} /> : <InvestmentPanel />}
              </div>
            </main>
          </>
        ) : (
          <AwardsScreen />
        )}
        {view === 'dashboard' && <EventTicker />}
        {view === 'dashboard' && <TaskStrip />}
        {view === 'dashboard' && <GachaStage />}
        <TutorialModal />
        <NewsMenu />
        <NoticeHost />
        <GachaResultModal />
        <ShortcutsDialog />
        <ConfirmDialog />
        <ToastHost />
      </div>
    </div>
  );
}
