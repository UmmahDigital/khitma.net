// Link previews for shared khitma links. WhatsApp, Telegram and the like read a page's tags without running
// JavaScript, so every /group/{id} link used to show the same generic card. Firebase Hosting sends those links to
// this function, which returns the app's own index.html with the khitma's title and progress in its tags.
// Group pages stay out of search engines (noindex): their titles often carry the names of the deceased.

import { readFileSync } from 'node:fs';

const NUM_OF_AJZA = 30;
const DONE = 2;
const IDLE = 0;

/**
 * The preview in the language a shared link asks for (?hl=ur), for the languages whose links carry one
 * (src/app/languages.ts). Written from the app's translations by tools/i18n/preview-texts.mjs.
 */
const TEXTS = JSON.parse(readFileSync(new URL('./preview-texts.json', import.meta.url), 'utf8'));

/** "جزء واحد"، "جزءان"، "5 أجزاء"، "18 جزءًا" (as in the app's share messages). */
export function ajzaCount(count) {
  if (count === 1) return 'جزء واحد';
  if (count === 2) return 'جزءان';
  if (count >= 3 && count <= 10) return `${count} أجزاء`;
  return `${count} جزءًا`;
}

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

/** The preview's title and description for a group document, in Arabic or in the language of `lang` (?hl=). */
export function previewText(group, lang) {
  const t = Object.hasOwn(TEXTS, lang ?? '') ? TEXTS[lang] : null;
  const title = String(group?.title ?? '').trim().slice(0, 120) || (t ? t.brand : 'ختمة.نت');
  const ajza = Array.isArray(group?.ajza) ? group.ajza : Object.values(group?.ajza ?? {});
  const sequential = !group?.type || group.type === 'SEQUENTIAL';
  if (t) {
    return { title, description: localDescription(t, sequential && ajza.length === NUM_OF_AJZA ? ajza : null) };
  }
  if (!sequential || ajza.length !== NUM_OF_AJZA) {
    return { title, description: 'انضمّوا إلى الختمة وشاركونا الأجر 🤍' };
  }
  const done = ajza.filter((juz) => juz?.status === DONE).length;
  const free = ajza.filter((juz) => juz?.status === IDLE).length;
  if (done === NUM_OF_AJZA) {
    return { title, description: 'تمّت الختمة بفضل الله 🤍' };
  }
  const read = done > 0 ? `تمّت قراءة ${done} من 30 جزءًا. ` : '';
  const left = free > 0 ? `بقي ${ajzaCount(free)} بلا قارئ: اختاروا جزءًا وشاركونا الأجر 🤍` : 'جميع الأجزاء محجوزة، ويمكنكم متابعة الختمة.';
  return { title, description: read + left };
}

/**
 * The page's address for og:url, keeping the language of a localized preview: Facebook and Messenger show the tags
 * found at that address, so a link shared in Turkish would otherwise get the Arabic preview there.
 */
export function previewUrl(site, id, lang) {
  return Object.hasOwn(TEXTS, lang ?? '') ? `${site}/group/${id}?hl=${lang}` : `${site}/group/${id}`;
}

/** As the Arabic one below: what was read, then what's left (or that it's complete). */
function localDescription(t, ajza) {
  if (!ajza) {
    return `${t.join} 🤍`;
  }
  const done = ajza.filter((juz) => juz?.status === DONE).length;
  const free = ajza.filter((juz) => juz?.status === IDLE).length;
  if (done === NUM_OF_AJZA) {
    return `${t.complete} 🤍`;
  }
  const count = `${free} ${free === 1 ? t.juz.one : t.juz.other}`;
  const read = done > 0 ? `${fill(t.progress, { done })}${t.stop} ` : '';
  const left = free > 0 ? `${fill(t.freeLeft, { count })}: ${t.invitation} 🤍` : `${t.allTaken}${t.stop}`;
  return read + left;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setMeta(html, attribute, key, value) {
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*">`);
  const tag = `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`;
  // Replaced by functions: in a replacement string, a title's $' or $& would paste parts of the page.
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `  ${tag}\n</head>`);
}

/** index.html with the group's preview tags, and kept out of search engines. */
export function withPreview(html, { title, description, url }) {
  let page = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttribute(title)}</title>`);
  page = setMeta(page, 'name', 'description', description);
  page = setMeta(page, 'property', 'og:title', title);
  page = setMeta(page, 'property', 'og:description', description);
  page = setMeta(page, 'property', 'og:url', url);
  page = setMeta(page, 'name', 'twitter:title', title);
  page = setMeta(page, 'name', 'twitter:description', description);
  page = setMeta(page, 'name', 'robots', 'noindex');
  return page;
}
