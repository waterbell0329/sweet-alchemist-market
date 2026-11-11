import { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Eye,
  EyeOff,
  Keyboard,
  Lock,
  LockOpen,
  Maximize,
  Minimize,
  Newspaper,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Grade } from '../data/gameConfig';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import { useTeacherActions } from '../hooks/useTeacherActions';
import type { AudioStatus } from '../engine/soundEngine';
import type { LangMode } from '../i18n';
import { GameTimer } from './GameTimer';
import { TimelineBar } from './TimelineBar';
import { Bi } from './ui';

const LANG_BUTTONS: { mode: LangMode; top: string; sub: string }[] = [
  { mode: 'ko', top: 'KO', sub: '한국어' },
  { mode: 'id', top: 'ID', sub: 'Indonesia' },
  { mode: 'both', top: 'KO+ID', sub: '한국어 + Indonesia' },
];

function IconBtn({
  label,
  onClick,
  children,
  active,
  disabled,
  badge,
  tone = 'choco',
  shortcut,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
  tone?: 'choco' | 'gold' | 'coral';
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      className={`btn focus-ring relative h-[54px] w-[54px] ${active ? 'btn-gold' : tone === 'coral' ? 'btn-coral' : tone === 'gold' ? 'btn-gold' : 'btn-choco'}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-3 -top-3 flex h-[26px] min-w-[26px] items-center justify-center border-2 border-black bg-coral px-1 font-pixel text-[11px] text-cream">
          {badge}
        </span>
      )}
    </button>
  );
}

export function Header({ audio }: { audio: AudioStatus }) {
  const grade = useGame((s) => s.grade);
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const presentation = useGame((s) => s.presentation);
  const togglePresentation = useGame((s) => s.togglePresentation);
  const locked = useGame((s) => s.locked);
  const queue = useGame((s) => s.notices.length);
  const newsMenuOpen = useGame((s) => s.newsMenuOpen);
  const setNewsMenu = useGame((s) => s.setNewsMenu);
  const setTutorial = useGame((s) => s.setTutorial);
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const sec = useGame((s) => s.sec);
  const setShortcuts = useGame((s) => s.setShortcuts);
  const snoozeNotice = useGame((s) => s.snoozeNotice);
  const { t } = useT();
  const actions = useTeacherActions();
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <header className="absolute left-4 right-4 top-3 grid h-[176px] grid-cols-[500px_1fr_560px] gap-4">
      {/* ---------- left: brand + mode toggles ---------- */}
      <div className="flex flex-col justify-between py-1">
        <div className="flex items-center gap-4">
          <div className="slot slot-dark h-[68px] w-[68px] flex-none text-[40px]" aria-hidden>
            🧪
          </div>
          <div className="min-w-0">
            <div className="font-pixel text-[24px] leading-[1.25] text-gold" style={{ textShadow: '3px 3px 0 #000' }}>
              SWEET ALCHEMIST
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-pixel text-[24px] leading-[1.25] text-cream" style={{ textShadow: '3px 3px 0 #000' }}>
                MARKET
              </span>
              <Bi k="appSubtitle" size="xs" px={[15, 12]} inline className="text-cream/70" weight={500} />
            </div>
          </div>
        </div>
        {!presentation && (
          <div className="flex items-end gap-3">
            <div className="seg" role="group" aria-label={t('gradeLabel')}>
              {([4, 6] as Grade[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={grade === g}
                  disabled={locked}
                  className="flex h-[62px] w-[130px] flex-col items-center justify-center px-1"
                  onClick={() => actions.changeGrade(g)}
                >
                  <Bi k={g === 4 ? 'grade4' : 'grade6'} size="xs" px={[15, 12]} className="items-center text-center" weight={700} />
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label={t('languageLabel')}>
              {LANG_BUTTONS.map((b) => (
                <button
                  key={b.mode}
                  type="button"
                  aria-pressed={lang === b.mode}
                  className="flex h-[62px] w-[72px] flex-col items-center justify-center"
                  onClick={() => setLang(b.mode)}
                  title={b.sub}
                  aria-keyshortcuts="L"
                >
                  <span className="font-pixel text-[12px]">{b.top}</span>
                  <span className="mt-1 text-[12px] font-medium leading-tight">{b.mode === 'both' ? '한+ID' : b.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- center: timer + time controls ---------- */}
      <GameTimer />

      {/* ---------- right: timeline + tools ---------- */}
      <div className="flex flex-col justify-between">
        <TimelineBar />
        <div className="flex items-center justify-end gap-[8px]">
          {!presentation && (
            <>
              <IconBtn label={t('tutorial')} onClick={() => setTutorial({ open: true })} shortcut="T">
                <BookOpen size={24} strokeWidth={2.5} />
              </IconBtn>
              <IconBtn label={t('newsMenu')} onClick={() => setNewsMenu(!newsMenuOpen)} active={newsMenuOpen} disabled={locked || sec <= 600}>
                <Newspaper size={24} strokeWidth={2.5} />
              </IconBtn>
              <IconBtn label={t('pendingQueue', { count: queue })} onClick={() => snoozeNotice(null)} badge={queue} disabled={queue === 0}>
                <Bell size={24} strokeWidth={2.5} />
              </IconBtn>
              <IconBtn
                label={t('awards')}
                onClick={() => setView(view === 'awards' ? 'dashboard' : 'awards')}
                active={view === 'awards'}
                tone={sec <= 600 && view !== 'awards' ? 'gold' : 'choco'}
              >
                <Trophy size={24} strokeWidth={2.5} />
              </IconBtn>
              <IconBtn label={t('shortcuts')} onClick={() => setShortcuts(true)}>
                <Keyboard size={24} strokeWidth={2.5} />
              </IconBtn>
              <IconBtn label={locked ? t('unlock') : t('lock')} onClick={actions.toggleLock} active={locked}>
                {locked ? <Lock size={24} strokeWidth={2.5} /> : <LockOpen size={24} strokeWidth={2.5} />}
              </IconBtn>
            </>
          )}
          <IconBtn
            label={muted ? t('unmute') : audio === 'locked' ? t('soundLocked') : audio === 'unsupported' ? t('soundUnsupported') : t('mute')}
            onClick={() => setMuted(!muted)}
            tone={muted || audio !== 'ready' ? 'coral' : 'choco'}
            shortcut="M"
          >
            {muted || audio !== 'ready' ? <VolumeX size={24} strokeWidth={2.5} /> : <Volume2 size={24} strokeWidth={2.5} />}
          </IconBtn>
          <IconBtn label={t('fullscreen')} onClick={actions.toggleFullscreen} active={fs} shortcut="F">
            {fs ? <Minimize size={24} strokeWidth={2.5} /> : <Maximize size={24} strokeWidth={2.5} />}
          </IconBtn>
          <IconBtn label={presentation ? t('presentationOff') : t('presentation')} onClick={togglePresentation} active={presentation} shortcut="H">
            {presentation ? <EyeOff size={24} strokeWidth={2.5} /> : <Eye size={24} strokeWidth={2.5} />}
          </IconBtn>
        </div>
      </div>
      {!presentation && audio === 'locked' && !muted && (
        <div className="pointer-events-none absolute -bottom-[8px] right-0 translate-y-full border-2 border-black bg-coral px-2 py-[2px] text-[13px] text-cream">
          🔈 {t('soundLocked')}
        </div>
      )}
    </header>
  );
}
