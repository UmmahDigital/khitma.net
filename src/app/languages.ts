// The languages the app speaks. Arabic is the source of every text; the others come from src/assets/translate.
// index.html repeats firstLanguage, DEFAULT_FROM_PHONE, the direction and the ?lang= handling in its first script,
// which runs before the app (so the page never paints in the wrong direction): keep the two in step.

export interface Language {
  code: string;
  /** Its own name, as the language menu lists it. */
  name: string;
  dir: 'rtl' | 'ltr';
  /** «5 juz»: the word after a count of ajza (Arabic has its own forms, in share-messages.ts). */
  juz: { one: string; other: string };
}

export const LANGUAGES: Language[] = [
  { code: 'ar', name: 'العربية', dir: 'rtl', juz: { one: 'جزء', other: 'أجزاء' } },
  { code: 'en', name: 'English', dir: 'ltr', juz: { one: 'juz', other: 'juz' } },
  { code: 'fr', name: 'Français', dir: 'ltr', juz: { one: 'juz', other: 'juz' } },
  { code: 'es', name: 'Español', dir: 'ltr', juz: { one: 'juz', other: 'juz' } },
  { code: 'de', name: 'Deutsch', dir: 'ltr', juz: { one: 'Juz', other: 'Juz' } },
  { code: 'ur', name: 'اردو', dir: 'rtl', juz: { one: 'پارہ', other: 'پارے' } },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', juz: { one: 'juz', other: 'juz' } },
  { code: 'ms', name: 'Bahasa Melayu', dir: 'ltr', juz: { one: 'juzuk', other: 'juzuk' } },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', juz: { one: 'cüz', other: 'cüz' } },
  { code: 'bn', name: 'বাংলা', dir: 'ltr', juz: { one: 'পারা', other: 'পারা' } },
];

/** The languages a newcomer can get without choosing one: from the link they opened, or from their phone. */
export const DEFAULT_FROM_PHONE = ['ur', 'id', 'ms', 'tr', 'bn'];

/**
 * Written on anyone's first visit (local-database.service.ts, since 2021): this phone opened the app back when it
 * spoke Arabic to everyone who hadn't picked a language.
 */
export const OPENED_BEFORE_KEY = 'personalKhitma';

export function isSupported(code: string | null | undefined): boolean {
  return !!code && LANGUAGES.some((language) => language.code === code);
}

export function isRtl(lang: string): boolean {
  return LANGUAGES.find((language) => language.code === lang)?.dir === 'rtl';
}

/** Arabic and Urdu write their own comma, «،». */
export function arabicComma(lang: string): boolean {
  return lang === 'ar' || lang === 'ur';
}

export function listSeparator(lang: string): string {
  return arabicComma(lang) ? '، ' : ', ';
}

/**
 * The language of someone's first visit without one of their own, which index.html then keeps for them:
 * - Arabic if this phone had opened the app before (it has been using it in Arabic);
 * - Arabic if the phone lists Arabic among its languages;
 * - the language of the link they opened, if it was shared in one of the five above (?hl=);
 * - their phone's, if it is one of the five;
 * - otherwise Arabic.
 * iPhones tell a page only their main language, so an Arabic speaker whose iPhone is in Turkish, say, gets Turkish:
 * the language menu is at the top of every page.
 */
export function firstLanguage(phoneLanguages: readonly string[], linkLanguage: string | null, openedBefore: boolean): string {
  const phone = phoneLanguages.map((tag) => tag.toLowerCase().split(/[-_]/)[0]).map((code) => (code === 'in' ? 'id' : code));
  if (openedBefore || phone.includes('ar')) {
    return 'ar';
  }
  if (linkLanguage && DEFAULT_FROM_PHONE.includes(linkLanguage)) {
    return linkLanguage;
  }
  return phone.find((code) => DEFAULT_FROM_PHONE.includes(code)) ?? 'ar';
}

/** The app's language on this phone: picked in the menu or by a link, or that of the first visit (both stored). */
export function appLanguage(): string {
  const stored = localStorage.getItem('lng');
  if (isSupported(stored)) {
    return stored;
  }
  // index.html stores the first visit's language before the app starts; the same choice, should it have failed to.
  const link = new URLSearchParams(location.search).get('hl');
  return firstLanguage(navigator.languages ?? [navigator.language], link, !!localStorage.getItem(OPENED_BEFORE_KEY));
}

/**
 * Links shared in one of the five languages above carry it (?hl=ur): many of their readers keep their phone in
 * English, and would otherwise get Arabic. It counts on a reader's first visit only (firstLanguage).
 */
export function withLanguageHint(url: string, lang: string): string {
  if (!DEFAULT_FROM_PHONE.includes(lang)) {
    return url;
  }
  const [base, hash] = url.split('#');
  return `${base}${base.includes('?') ? '&' : '?'}hl=${lang}${hash === undefined ? '' : '#' + hash}`;
}

/** «5 juz», «1 پارہ», «3 cüz»; Arabic counts are in share-messages.ts. */
export function juzCount(count: number, lang: string): string {
  const words = LANGUAGES.find((language) => language.code === lang)?.juz ?? LANGUAGES[1].juz;
  return `${count} ${count === 1 ? words.one : words.other}`;
}

/**
 * The locale for dates and weekdays (Intl). Bengali writes them with Western digits, as the app's counts and juz
 * numbers are, so a line never mixes «৬/৩/২০২৬» with «5».
 */
export function intlLocale(lang: string): string {
  return lang === 'bn' ? 'bn-u-nu-latn' : lang;
}
