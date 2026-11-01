import { firstLanguage, intlLocale, isRtl, juzCount, LANGUAGES, listSeparator, withLanguageHint } from './languages';

describe('languages', () => {
  it('has a translation file name, a direction and juz words for each language', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(['ar', 'en', 'fr', 'es', 'de', 'ur', 'id', 'ms', 'tr', 'bn']);
    expect(LANGUAGES.filter((language) => language.dir === 'rtl').map((language) => language.code)).toEqual(['ar', 'ur']);
  });

  it('writes Arabic and Urdu right to left, with their own comma', () => {
    expect(isRtl('ur')).toBe(true);
    expect(isRtl('tr')).toBe(false);
    expect(listSeparator('ur')).toBe('، ');
    expect(listSeparator('bn')).toBe(', ');
  });

  it('counts ajza in each language', () => {
    expect(juzCount(1, 'ur')).toBe('1 پارہ');
    expect(juzCount(5, 'ur')).toBe('5 پارے');
    expect(juzCount(5, 'tr')).toBe('5 cüz');
    expect(juzCount(5, 'ms')).toBe('5 juzuk');
    expect(juzCount(5, 'de')).toBe('5 Juz');
    expect(juzCount(5, 'xx')).toBe('5 juz');
  });

  it('writes Bengali dates in Western digits, like the app’s counts', () => {
    const date = new Date(2026, 2, 6).toLocaleDateString(intlLocale('bn'), { weekday: 'long', day: 'numeric', month: 'numeric' });
    expect(date).toMatch(/6\D3/);
    expect(date).not.toMatch(/[\u09E6-\u09EF]/);
    expect(intlLocale('tr')).toBe('tr');
  });

  it('adds the sharer’s language to links shared in the five languages, and only those', () => {
    expect(withLanguageHint('https://khitma.net/group/abc?r=k7f2xq9a', 'ur')).toBe('https://khitma.net/group/abc?r=k7f2xq9a&hl=ur');
    expect(withLanguageHint('https://khitma.net/group/abc', 'tr')).toBe('https://khitma.net/group/abc?hl=tr');
    expect(withLanguageHint('https://khitma.net/#x', 'bn')).toBe('https://khitma.net/?hl=bn#x');
    expect(withLanguageHint('https://khitma.net/group/abc', 'ar')).toBe('https://khitma.net/group/abc');
    expect(withLanguageHint('https://khitma.net/group/abc', 'en')).toBe('https://khitma.net/group/abc');
  });

  describe('the language of a first visit', () => {
    it('is the phone’s, for the five languages added in 2026', () => {
      expect(firstLanguage(['tr-TR', 'en-US'], null, false)).toBe('tr');
      expect(firstLanguage(['ur-PK'], null, false)).toBe('ur');
      expect(firstLanguage(['bn-BD', 'en'], null, false)).toBe('bn');
      expect(firstLanguage(['ms-MY'], null, false)).toBe('ms');
      // Older Android WebViews report Indonesian with its old code.
      expect(firstLanguage(['in-ID'], null, false)).toBe('id');
    });

    it('is that of a link shared in one of them, before the phone’s', () => {
      expect(firstLanguage(['en-US'], 'ur', false)).toBe('ur');
      expect(firstLanguage(['tr-TR'], 'bn', false)).toBe('bn');
      expect(firstLanguage(['en-US'], 'en', false)).toBe('ar');
      expect(firstLanguage(['en-US'], 'xx', false)).toBe('ar');
    });

    it('stays Arabic for everyone else, for a phone that also speaks Arabic, and for anyone who used the app before', () => {
      expect(firstLanguage(['en-US'], null, false)).toBe('ar');
      expect(firstLanguage(['fr-FR', 'de'], null, false)).toBe('ar');
      expect(firstLanguage(['tr-TR', 'ar-SY'], null, false)).toBe('ar');
      expect(firstLanguage(['en-US', 'ar'], 'ur', false)).toBe('ar');
      expect(firstLanguage([], null, false)).toBe('ar');
      expect(firstLanguage(['tr-TR'], null, true)).toBe('ar');
      expect(firstLanguage(['en-US'], 'ur', true)).toBe('ar');
    });
  });
});
