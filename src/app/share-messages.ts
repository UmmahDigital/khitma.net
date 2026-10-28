import { Juz, JUZ_STATUS } from './entities/entities';

// Texts for sharing a khitma. Arabic is the source; the other languages come from the translation files.

/** Sahih Muslim 1893, in Arabic in every language (translations add its meaning after it). */
export const SHARE_HADITH = '«مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ» (رواه مسلم)';

/** "جزء واحد"، "جزءان"، "5 أجزاء"، "18 جزءًا" — or "18 juz" in other languages. */
export function ajzaCount(count: number, lang: string): string {
  if (lang !== 'ar') {
    return lang === 'de' ? `${count} Juz` : `${count} juz`;
  }
  if (count === 1) return 'جزء واحد';
  if (count === 2) return 'جزءان';
  if (count >= 3 && count <= 10) return `${count} أجزاء`;
  return `${count} جزءًا`;
}

export function freeAjza(ajza: Juz[]): number[] {
  return ajza.filter((juz) => juz.status === JUZ_STATUS.IDLE).map((juz) => juz.index + 1);
}

export function readingAjza(ajza: Juz[]): number[] {
  return ajza.filter((juz) => juz.status === JUZ_STATUS.BOOKED).map((juz) => juz.index + 1);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

/** The hadith, plus its meaning in the reader's language. */
export function hadithLine(translation: any): string {
  const meaning = translation?.sharing?.hadithMeaning;
  return meaning ? `${SHARE_HADITH}\n${meaning}` : SHARE_HADITH;
}

/** "Join the khitma «…» and pick a juz", the link, then the hadith. */
export function inviteMessage(translation: any, title: string, url: string): string {
  const template = translation?.sharing?.inviteMessage || 'انضمّوا إلى ختمة «{title}»، واختاروا جزءًا لقراءته 📖';
  return [fill(template, { title }), url, '', hadithLine(translation)].join('\n');
}

/** For a khitma with free ajza: what's left, which ones, and the link to pick one. */
export function helpFinishMessage(translation: any, lang: string, title: string, url: string, free: number[]): string {
  const template =
    translation?.sharing?.helpMessage || 'ساعدونا في إتمام ختمة «{title}» 🤍\nبقي {count} بلا قارئ: {list}\nاختاروا جزءًا من الرابط:';
  const list = free.join(lang === 'ar' ? '، ' : ', ');
  return [fill(template, { title, count: ajzaCount(free.length, lang), list }), url, '', hadithLine(translation)].join('\n');
}
