import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { biText, type BiText } from '../hooks/useT';
import { useGame } from '../store/gameStore';
import type { Params, TKey } from '../i18n';
import { sound } from '../engine/soundEngine';

export type BiSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'hero';
const SIZES: Record<BiSize, [number, number]> = {
  xs: [14, 12],
  sm: [17, 13],
  md: [20, 15],
  lg: [24, 16],
  xl: [30, 18],
  '2xl': [42, 22],
  '3xl': [56, 26],
  hero: [76, 32],
};

interface BiProps {
  k?: TKey;
  p?: Params;
  kp?: Record<string, TKey>;
  text?: BiText;
  size?: BiSize;
  className?: string;
  secondaryClassName?: string;
  inline?: boolean;
  /** Override primary/secondary px sizes. */
  px?: [number, number];
  weight?: number;
  pixel?: boolean;
}

/**
 * Bilingual text. ko / id modes render one language; "both" renders Indonesian large
 * (students) with Korean underneath (teachers).
 */
export function Bi({ k, p, kp, text, size = 'md', className = '', secondaryClassName = '', inline, px, weight = 600, pixel }: BiProps) {
  const mode = useGame((s) => s.lang);
  const tx = text ?? biText(k!, p, kp);
  const [a, b] = px ?? SIZES[size];
  const primaryStyle: CSSProperties = { fontSize: a, fontWeight: weight, lineHeight: 1.12 };
  const pixelCls = pixel ? 'font-pixel' : '';
  if (mode !== 'both') {
    return (
      <span className={`${pixelCls} ${className}`} style={primaryStyle} lang={mode}>
        {mode === 'ko' ? tx.ko : tx.id}
      </span>
    );
  }
  if (inline) {
    return (
      <span className={className}>
        <span className={pixelCls} style={primaryStyle} lang="id">
          {tx.id}
        </span>
        <span className={`ml-2 inline-block font-ko opacity-75 ${secondaryClassName}`} style={{ fontSize: b, fontWeight: 500 }} lang="ko">
          {tx.ko}
        </span>
      </span>
    );
  }
  return (
    <span className={`flex flex-col ${className}`}>
      <span className={pixelCls} style={primaryStyle} lang="id">
        {tx.id}
      </span>
      <span className={`font-ko opacity-75 ${secondaryClassName}`} style={{ fontSize: b, fontWeight: 500, lineHeight: 1.2, marginTop: 2 }} lang="ko">
        {tx.ko}
      </span>
    </span>
  );
}

export function Coin({ kind, size = 32, label = true }: { kind: 'gold' | 'silver'; size?: number; label?: boolean }) {
  return (
    <span
      className={`coin coin-${kind}`}
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.36) }}
      role="img"
      aria-label={kind === 'gold' ? 'Gold 5' : 'Silver 1'}
    >
      {label ? (kind === 'gold' ? '5' : '1') : null}
    </span>
  );
}

/** A row of coin icons for a total, e.g. 12 → ●● (gold) + ●● (silver). */
export function CoinStack({ total, size = 26, max = 8 }: { total: number; size?: number; max?: number }) {
  const gold = Math.floor(total / 5);
  const silver = total % 5;
  const items: ('gold' | 'silver')[] = [...Array(gold).fill('gold'), ...Array(silver).fill('silver')];
  const shown = items.slice(0, max);
  return (
    <span className="inline-flex items-center" aria-label={`${gold} gold, ${silver} silver`}>
      {shown.map((k, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.35 }}>
          <Coin kind={k} size={size} label={false} />
        </span>
      ))}
      {items.length > max && <span className="ml-1 font-pixel text-[12px]">+{items.length - max}</span>}
    </span>
  );
}

type BtnTone = 'gold' | 'mint' | 'coral' | 'cream' | 'silver' | 'choco' | 'dark';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BtnTone;
  children: ReactNode;
  silent?: boolean;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { tone = 'choco', className = '', children, onClick, silent, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn-${tone} focus-ring ${className}`}
      onClick={(e) => {
        if (!silent) sound.play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

export function PanelTitle({ k, icon, right, size = 'lg' }: { k: TKey; icon?: ReactNode; right?: ReactNode; size?: BiSize }) {
  return (
    <div className="panel-title">
      <span className="gem" aria-hidden />
      {icon}
      <h2 className="min-w-0 flex-1 text-gold">
        <Bi k={k} size={size} px={size === 'lg' ? [28, 16] : undefined} weight={700} inline />
      </h2>
      {right}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  disabled,
  width = 72,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
  disabled?: boolean;
  width?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-stretch" role="group" aria-label={label}>
      <button
        type="button"
        className="btn btn-choco h-[48px] w-[44px] text-[24px] focus-ring"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`${label} −1`}
      >
        −
      </button>
      <input
        className="input-pixel mx-[6px] h-[48px] text-[20px]"
        style={{ width }}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ''}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isFinite(n) ? n : NaN);
        }}
        onBlur={(e) => {
          const n = e.target.valueAsNumber;
          if (!Number.isFinite(n)) onChange(min);
        }}
      />
      <button
        type="button"
        className="btn btn-choco h-[48px] w-[44px] text-[24px] focus-ring"
        onClick={() => onChange(clamp((Number.isFinite(value) ? value : min - 1) + 1))}
        disabled={disabled || value >= max}
        aria-label={`${label} +1`}
      >
        +
      </button>
    </div>
  );
}

/** Overlay below the header (timer stays visible) or covering everything. */
export function Overlay({ children, full, z = 30, label }: { children: ReactNode; full?: boolean; z?: number; label: string }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-center"
      style={{ top: full ? 0 : 196, zIndex: z, background: 'rgba(13, 9, 5, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}
