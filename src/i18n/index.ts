import { id } from './id';
import { ko, type TKey } from './ko';
import type { Entry, Lang, LangMode, Params } from './types';

export type { TKey } from './ko';
export type { Lang, LangMode, Params } from './types';

export const dictionaries: Record<Lang, Record<TKey, Entry>> = { ko, id };

const reported = new Set<string>();
/** Missing keys / params seen at runtime (inspectable in devtools as window.__i18nMissing). */
export const missingRuntime: string[] = [];

function report(msg: string) {
  if (reported.has(msg)) return;
  reported.add(msg);
  missingRuntime.push(msg);
  if (typeof console !== 'undefined') console.warn(`[i18n] ${msg}`);
}

function interpolate(template: string, params: Params | undefined, lang: Lang, key: string): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (params && name in params) return String(params[name]);
    report(`missing param "${name}" for ${lang}.${key}`);
    return match;
  });
}

/** Translate a full sentence. Plural entries choose a form from params.count. */
export function translate(lang: Lang, key: TKey, params?: Params): string {
  const entry = dictionaries[lang][key] as Entry | undefined;
  if (entry === undefined) {
    report(`missing key ${lang}.${key}`);
    const fallback = dictionaries[lang === 'ko' ? 'id' : 'ko'][key];
    return fallback === undefined ? key : translate(lang === 'ko' ? 'id' : 'ko', key, params);
  }
  let template: string;
  if (typeof entry === 'string') template = entry;
  else {
    const count = Number(params?.count);
    if (!Number.isFinite(count)) report(`plural ${lang}.${key} used without count`);
    template = count === 1 ? entry.one : entry.other;
  }
  return interpolate(template, params, lang, key);
}

/** Keys present in one dictionary but not the other (also checks plural shape). */
export function findMissingKeys(): { missingInKo: string[]; missingInId: string[]; shapeMismatch: string[] } {
  const k = Object.keys(ko);
  const i = Object.keys(id);
  const shapeMismatch = k.filter((key) => key in id && typeof ko[key as TKey] !== typeof id[key as TKey]);
  return {
    missingInKo: i.filter((x) => !(x in ko)),
    missingInId: k.filter((x) => !(x in id)),
    shapeMismatch,
  };
}

/** Placeholder names used by a key in a language, for parity tests. */
export function placeholders(lang: Lang, key: TKey): string[] {
  const e = dictionaries[lang][key];
  const text = typeof e === 'string' ? e : `${e.one} ${e.other}`;
  return Array.from(new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1]))).sort();
}

/** Primary language for single-line UI in a given mode (students read Indonesian first). */
export const primaryLang = (mode: LangMode): Lang => (mode === 'ko' ? 'ko' : 'id');

export const LANG_MODES: LangMode[] = ['ko', 'id', 'both'];
export const nextLangMode = (m: LangMode): LangMode => LANG_MODES[(LANG_MODES.indexOf(m) + 1) % LANG_MODES.length];
