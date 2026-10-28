// What a khitma is for. Most one-time khitmas are read for someone who passed away, so the create form asks first
// and writes the title itself; the purpose is also stored on the group and sent to analytics instead of titles.

export type Purpose = 'memorial' | 'healing' | 'ramadan' | 'intention' | 'other' | 'regular';
export type HonoreeGender = 'male' | 'female';

/** The choices on the create form for a one-time khitma, in this order. */
export const ONE_TIME_PURPOSES: Purpose[] = ['memorial', 'healing', 'ramadan', 'intention', 'other'];

const LABELS: Record<string, string> = {
  memorial: 'عن روح متوفّى',
  healing: 'لشفاء مريض',
  ramadan: 'في رمضان',
  intention: 'بنيّة خاصّة',
  other: 'غير ذلك',
};

export function purposeLabel(purpose: Purpose, translation: any): string {
  return translation?.purpose?.[purpose] || LABELS[purpose] || purpose;
}

/** Purposes whose title names a person, with رحمه/رحمها or شفاه/شفاها. */
export function namesSomeone(purpose: Purpose | null): boolean {
  return purpose === 'memorial' || purpose === 'healing';
}

const TITLES: Record<string, string> = {
  memorialMale: 'ختمة عن روح {name} رحمه الله',
  memorialFemale: 'ختمة عن روح {name} رحمها الله',
  healingMale: 'ختمة لشفاء {name} شفاه الله',
  healingFemale: 'ختمة لشفاء {name} شفاها الله',
  ramadan: 'ختمة رمضان',
};

/** The title the form suggests, or null when there's nothing to suggest (yet). */
export function purposeTitle(purpose: Purpose | null, name: string, gender: HonoreeGender, translation: any): string | null {
  const t = translation?.purpose ?? {};
  if (purpose === 'ramadan') {
    return t.ramadanTitle || TITLES.ramadan;
  }
  const person = (name ?? '').trim();
  if (!namesSomeone(purpose) || !person) {
    return null;
  }
  const key = purpose + (gender === 'female' ? 'Female' : 'Male') + 'Title';
  const template = t[key] || TITLES[purpose + (gender === 'female' ? 'Female' : 'Male')];
  return template.replace('{name}', person);
}

/** "ختمة «العائلة»", but "ختمة عن روح …" as it is: titles often already start with the word. */
export function khitmaName(title: string): string {
  const name = (title ?? '').trim();
  return /^(ال)?ختم/.test(name) ? name : `ختمة «${name}»`;
}

/**
 * Said when a memorial khitma is complete. The opening of the Prophet's ﷺ supplication for the deceased
 * (Sahih Muslim 963), with feminine pronouns for a woman.
 */
export function memorialDua(gender: HonoreeGender | undefined): string {
  return gender === 'female'
    ? 'اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا، وَعَافِهَا وَاعْفُ عَنْهَا، وَأَكْرِمْ نُزُلَهَا، وَوَسِّعْ مُدْخَلَهَا'
    : 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ';
}
