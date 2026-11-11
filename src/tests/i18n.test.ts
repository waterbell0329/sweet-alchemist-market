import { describe, expect, it } from 'vitest';
import { dictionaries, findMissingKeys, placeholders, translate, type TKey } from '../i18n';
import { ko } from '../i18n/ko';

describe('i18n', () => {
  it('Korean and Indonesian dictionaries have identical key sets and entry shapes', () => {
    expect(findMissingKeys()).toEqual({ missingInKo: [], missingInId: [], shapeMismatch: [] });
  });

  it('every translation uses the same placeholders in both languages', () => {
    for (const key of Object.keys(ko) as TKey[]) {
      expect([key, placeholders('id', key)]).toEqual([key, placeholders('ko', key)]);
    }
  });

  it('no entry is empty', () => {
    for (const lang of ['ko', 'id'] as const)
      for (const [k, v] of Object.entries(dictionaries[lang])) {
        const text = typeof v === 'string' ? v : v.one + v.other;
        expect([lang, k, text.trim().length > 0]).toEqual([lang, k, true]);
      }
  });

  it('interpolates numbers into whole sentences', () => {
    expect(translate('ko', 'openRoundLine', { round: 2, time: '04:12' })).toBe('2차 모집 중 · 마감까지 04:12');
    expect(translate('id', 'openRoundLine', { round: 2, time: '04:12' })).toBe('Ronde 2 dibuka · tutup dalam 04:12');
    expect(translate('id', 'tier2Need', { grade: 6, count: 3 })).toBe('Kelas 6: perlu 3 camilan mini');
  });

  it('selects plural forms by count', () => {
    expect(translate('id', 'coinGold', { count: 1 })).toBe('1 koin emas');
    expect(translate('id', 'coinGold', { count: 3 })).toBe('3 koin emas');
    expect(translate('ko', 'coins', { count: 15 })).toBe('15코인');
  });

  it('spec phrases are present', () => {
    expect(translate('id', 'mustShowRecipe')).toBe('WAJIB TUNJUKKAN KARTU RESEP!');
    expect(translate('id', 'notice_lastCall_title')).toBe('PANGGILAN TERAKHIR!');
    expect(translate('id', 'notice_lastCall_body')).toBe('Misi selesai! Tukarkan koin dan bahan sebelum pasar tutup!');
    expect(translate('id', 'res_bigWin')).toBe('SELAMAT! UNTUNG +100%!');
    expect(translate('ko', 'tut1_title')).toBe('연금술 마켓에 오신 것을 환영합니다!');
  });
});
