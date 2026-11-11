import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../store/gameStore';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n';
import { Bi, Btn, Overlay } from './ui';

export function ConfirmDialog() {
  const req = useGame((s) => s.confirm);
  const ask = useGame((s) => s.askConfirm);
  const [step, setStep] = useState(0);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();

  useEffect(() => {
    setStep(0);
  }, [req]);
  useEffect(() => {
    if (!req) return;
    const cur = step === 0 ? req : req.next;
    (cur?.danger ? cancelRef : okRef).current?.focus();
  }, [req, step]);

  if (!req) return null;
  const cur = step === 0 ? req : { ...req, ...req.next! };
  const close = () => ask(null);
  const confirm = () => {
    if (step === 0 && req.next) {
      setStep(1);
      return;
    }
    close();
    req.onConfirm();
  };

  return (
    <Overlay full z={60} label={t(cur.titleKey)}>
      <div className="panel pop-in w-[860px] p-8" style={{ boxShadow: `0 0 0 5px ${cur.danger ? '#F43F5E' : '#FFD700'}, 12px 12px 0 5px #000` }}>
        {req.next && (
          <span className="mb-3 inline-block border-2 border-black bg-cream px-2 font-pixel text-[13px] text-black">
            {step + 1}/2
          </span>
        )}
        <Bi k={cur.titleKey} p={cur.params} kp={cur.keyParams} size="2xl" px={[38, 20]} weight={700} className={cur.danger ? 'text-coral' : 'text-gold'} />
        <Bi k={cur.bodyKey} p={cur.params} kp={cur.keyParams} size="md" px={[22, 16]} weight={500} className="mt-4 text-cream/90" />
        <div className="mt-8 flex justify-end gap-4">
          <Btn ref={cancelRef} tone="choco" className="h-[64px] min-w-[180px] text-[22px]" onClick={close}>
            {t('cancel')}
          </Btn>
          <Btn ref={okRef} tone={cur.danger ? 'coral' : 'gold'} className="h-[64px] min-w-[220px] px-6 text-[22px]" onClick={confirm}>
            {t((cur.confirmKey ?? 'confirm') as TKey)}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

export function ToastHost() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((x) => window.setTimeout(() => dismiss(x.uid), x.tone === 'danger' ? 3800 : 2600));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismiss]);
  return (
    <div className="pointer-events-none absolute bottom-[96px] right-6 z-[70] flex flex-col items-end gap-3" aria-live="polite">
      {toasts.map((x) => (
        <div
          key={x.uid}
          className={`toast-in pointer-events-auto border-[3px] border-black px-4 py-3 ${x.tone === 'danger' ? 'bg-coral text-cream' : x.tone === 'success' ? 'bg-mint text-black' : 'bg-cream text-black'}`}
          style={{ boxShadow: '5px 5px 0 #000' }}
          role="status"
        >
          <Bi k={x.key} p={x.params} kp={x.keyParams} size="sm" px={[19, 14]} weight={700} />
        </div>
      ))}
    </div>
  );
}

const SHORTCUTS: [string, TKey][] = [
  ['Space', 'sc_space'],
  ['+ / −', 'sc_plusminus'],
  ['N', 'sc_n'],
  ['S', 'sc_s'],
  ['Enter', 'sc_enter'],
  ['L', 'sc_l'],
  ['M', 'sc_m'],
  ['F', 'sc_f'],
  ['H', 'sc_h'],
  ['T', 'sc_t'],
  ['1 · 2 · 3', 'sc_screens'],
  ['[ / ]', 'sc_zoom'],
];

export function ShortcutsDialog() {
  const open = useGame((s) => s.shortcutsOpen);
  const setOpen = useGame((s) => s.setShortcuts);
  const { t } = useT();
  if (!open) return null;
  return (
    <Overlay z={55} label={t('shortcuts')}>
      <div className="panel w-[760px] p-6">
        <div className="mb-4 flex items-center">
          <Bi k="shortcuts" size="2xl" px={[34, 18]} weight={700} className="flex-1 text-gold" />
          <button type="button" className="btn btn-dark focus-ring h-[52px] w-[52px]" onClick={() => setOpen(false)} aria-label={t('close')} autoFocus>
            <X size={28} />
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map(([key, label]) => (
            <li key={key} className="flex items-center gap-3 border-[3px] border-black bg-choco px-3 py-2">
              <kbd className="min-w-[92px] border-[3px] border-black bg-cream px-2 py-1 text-center font-pixel text-[13px] text-black">{key}</kbd>
              <Bi k={label} size="sm" px={[18, 13]} weight={600} />
            </li>
          ))}
        </ul>
      </div>
    </Overlay>
  );
}
