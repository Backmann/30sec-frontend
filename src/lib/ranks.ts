import type { Locale } from './i18n';

/**
 * Rank titles localized by rank code.
 *
 * The DB stores the rank `title` in Russian as a fallback. The frontend uses
 * the `code` field to look up the localized name in this map. If a code is
 * unknown or a locale is missing, we fall back to the Russian DB value.
 *
 * Why frontend-only: the rank set is small (6 entries) and stable; adding a
 * new language is a 5-minute frontend change. A DB-side i18n column would
 * require migrations, backend changes, and Accept-Language plumbing for very
 * little benefit.
 */
const RANK_TITLE: Record<Locale, Record<string, string>> = {
  ru: {
    wooden: 'Деревянный',
    bronze: 'Бронза',
    silver: 'Серебро',
    gold: 'Золото',
    platinum: 'Платина',
    magister: 'Магистр',
  },
  en: {
    wooden: 'Wooden',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    magister: 'Magister',
  },
  de: {
    wooden: 'Holz',
    bronze: 'Bronze',
    silver: 'Silber',
    gold: 'Gold',
    platinum: 'Platin',
    magister: 'Magister',
  },
};

/**
 * Get the localized title for a rank.
 * Accepts the rank object as returned by the API ({ code, title, ... }) and
 * falls back to the DB title (Russian) when the code or locale is unknown.
 */
export function rankTitle(
  rank: { code?: string; title?: string } | null | undefined,
  locale: Locale,
): string {
  if (!rank) return '';
  if (rank.code && RANK_TITLE[locale]?.[rank.code]) {
    return RANK_TITLE[locale][rank.code];
  }
  return rank.title || '';
}
