import type { NewsId, ScheduledEvent } from '../data/events';
import { SCHEDULE } from '../data/events';
import { translate, type Lang, type TKey } from '../i18n';
import type { BiText } from '../hooks/useT';
import type { DrawRecord, LogEntry, Notice } from '../store/types';
import { formatPct, OUTCOME_BY_ID } from '../data/investments';

const both = (fn: (lang: Lang) => string): BiText => ({ id: fn('id'), ko: fn('ko') });

export const newsTitleKey = (id: NewsId) => `news_${id}_title` as TKey;
export const newsDescKey = (id: NewsId) => `news_${id}_desc` as TKey;

export function eventName(lang: Lang, e: ScheduledEvent): string {
  switch (e.type) {
    case 'phase':
      return translate(lang, `ev_phase_${e.payload.phase}` as TKey);
    case 'roundClose':
      return translate(lang, 'ev_roundClose', { round: e.payload.round });
    case 'roundDraw':
      return translate(lang, 'ev_roundDraw', { round: e.payload.round });
    case 'news':
      return translate(lang, newsTitleKey(e.payload.newsId));
  }
}

export const eventNameBi = (e: ScheduledEvent): BiText => both((l) => eventName(l, e));

export const nextEventBi = (e: ScheduledEvent): BiText => both((l) => translate(l, 'nextEvent', { event: eventName(l, e) }));

export function noticeTitle(lang: Lang, n: Notice): string {
  switch (n.kind) {
    case 'phase':
      return translate(lang, `notice_${n.phase}_title` as TKey);
    case 'roundClose':
      return translate(lang, 'notice_roundClose_title', { round: n.round! });
    case 'roundDraw':
      return translate(lang, 'notice_roundDraw_title', { round: n.round! });
    case 'news':
      return translate(lang, newsTitleKey(n.newsId!));
  }
}

export function drawWho(lang: Lang, r: DrawRecord): string {
  return r.studentNumber === null ? translate(lang, 'histAll') : translate(lang, 'histStudent', { student: r.studentNumber });
}

export function outcomeLabel(lang: Lang, r: { outcomeId: DrawRecord['outcomeId'] }): string {
  const o = OUTCOME_BY_ID[r.outcomeId];
  return `${o.emoji} ${translate(lang, `out_${o.id}` as TKey)} ${formatPct(o.returnPct)}`;
}

export function logText(lang: Lang, entry: LogEntry, draws: DrawRecord[]): string | null {
  switch (entry.kind) {
    case 'event': {
      const e = SCHEDULE.find((x) => x.id === entry.eventId);
      return e ? eventName(lang, e) : null;
    }
    case 'draw': {
      const r = draws.find((d) => d.uid === entry.recordId);
      if (!r) return null;
      const text = translate(lang, 'log_draw', { round: r.round, who: drawWho(lang, r), result: outcomeLabel(lang, r) });
      return r.voided ? `${text} (${translate(lang, 'voided')})` : text;
    }
    case 'news':
      return translate(lang, 'log_news', { title: translate(lang, newsTitleKey(entry.newsId)) });
    case 'newsEnd':
      return translate(lang, 'newsExpired', { title: translate(lang, newsTitleKey(entry.newsId)) });
    case 'newsCancel':
      return translate(lang, 'newsCancelled', { title: translate(lang, newsTitleKey(entry.newsId)) });
  }
}

export const logBi = (entry: LogEntry, draws: DrawRecord[]): BiText | null => {
  const id = logText('id', entry, draws);
  const ko = logText('ko', entry, draws);
  return id && ko ? { id, ko } : null;
};
