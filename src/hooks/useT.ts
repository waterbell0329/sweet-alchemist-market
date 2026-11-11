import { useCallback } from 'react';
import { useGame } from '../store/gameStore';
import { primaryLang, translate, type Lang, type LangMode, type Params, type TKey } from '../i18n';
import { splitCoins } from '../engine/investmentEngine';

export interface BiText {
  id: string;
  ko: string;
}

/** Resolve params that are themselves translation keys, per language. */
export function resolveParams(lang: Lang, params?: Params, keyParams?: Record<string, TKey>): Params | undefined {
  if (!keyParams) return params;
  const out: Params = { ...(params ?? {}) };
  for (const [k, key] of Object.entries(keyParams)) out[k] = translate(lang, key);
  return out;
}

export function biText(key: TKey, params?: Params, keyParams?: Record<string, TKey>): BiText {
  return {
    id: translate('id', key, resolveParams('id', params, keyParams)),
    ko: translate('ko', key, resolveParams('ko', params, keyParams)),
  };
}

/** "2 koin emas + 1 koin perak" built as a whole phrase in each language. */
export function coinPhrase(lang: Lang, total: number): string {
  const { gold, silver } = splitCoins(total);
  const parts: string[] = [];
  if (gold > 0) parts.push(translate(lang, 'coinGold', { count: gold }));
  if (silver > 0 || gold === 0) parts.push(translate(lang, 'coinSilver', { count: silver }));
  return parts.join(translate(lang, 'coinJoin'));
}

export function useT() {
  const mode: LangMode = useGame((s) => s.lang);
  const lang = primaryLang(mode);
  const t = useCallback(
    (key: TKey, params?: Params, keyParams?: Record<string, TKey>) => translate(lang, key, resolveParams(lang, params, keyParams)),
    [lang],
  );
  return { mode, lang, t, bi: biText };
}
