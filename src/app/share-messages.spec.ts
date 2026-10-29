import { ajzaCount, fill, helpFinishMessage, inviteMessage, SHARE_HADITH } from './share-messages';

describe('share messages', () => {
  it('counts ajza the way Arabic does', () => {
    expect(ajzaCount(1, 'ar')).toBe('جزء واحد');
    expect(ajzaCount(2, 'ar')).toBe('جزءان');
    expect(ajzaCount(3, 'ar')).toBe('3 أجزاء');
    expect(ajzaCount(10, 'ar')).toBe('10 أجزاء');
    expect(ajzaCount(11, 'ar')).toBe('11 جزءًا');
    expect(ajzaCount(30, 'ar')).toBe('30 جزءًا');
    expect(ajzaCount(4, 'en')).toBe('4 juz');
    expect(ajzaCount(4, 'de')).toBe('4 Juz');
  });

  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('invites with the link and the hadith, in Arabic when nothing is translated', () => {
    expect(inviteMessage({}, 'ختمة الجمعة', 'https://khitma.net/group/x')).toBe(
      'انضمّوا إلى ختمة الجمعة، واختاروا جزءًا لقراءته 📖\nhttps://khitma.net/group/x\n\n' + SHARE_HADITH
    );
  });

  it('adds the hadith’s meaning in other languages', () => {
    const en = { sharing: { inviteMessage: 'Join “{title}”', hadithMeaning: 'Whoever guides someone to good…' } };
    expect(inviteMessage(en, 'Friday', 'https://k/x')).toBe(
      'Join “Friday”\nhttps://k/x\n\n' + SHARE_HADITH + '\nWhoever guides someone to good…'
    );
  });

  it('lists the free ajza in the help message', () => {
    expect(helpFinishMessage({}, 'ar', 'ختمة', 'https://k/x', [4, 9])).toContain('بقي جزءان بلا قارئ: 4، 9');
    const en = { sharing: { helpMessage: '{count} left: {list}' } };
    expect(helpFinishMessage(en, 'en', 'T', 'https://k/x', [4, 9])).toContain('2 juz left: 4, 9');
  });
});
