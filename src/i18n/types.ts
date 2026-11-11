export type Lang = 'ko' | 'id';
export type LangMode = Lang | 'both';
/** A plain sentence, or plural forms selected by the `count` param. */
export type Entry = string | { one: string; other: string };
export type Params = Record<string, string | number>;
