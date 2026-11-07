// Names are typed by members when they join and by admins in the names list, and the same person's name is often
// written two ways: ة or ه, أ or ا, ى or ي, a vowel mark, a mark copied from WhatsApp, a double space. A member's juz
// is the one under her exact name, as always; when it isn't there but a name written like hers is, she is asked
// whether it's hers (after an admin re-typed a list, two members no longer found their juz).

/** Zero-width characters, direction marks and the tatweel, which WhatsApp copies along with names. */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C\u0640]/g;
/** Arabic vowel marks (tashkeel) and the dagger alif. */
const VOWEL_MARKS = /[\u064B-\u0652\u0670]/g;

/** A name as it compares with its other spellings: «أمّ محمّد» and «ام محمد» are one name. */
export function nameKey(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(VOWEL_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
