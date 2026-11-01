// Link previews for shared khitma links. WhatsApp, Telegram and the like read a page's tags without running
// JavaScript, so every /group/{id} link used to show the same generic card. Firebase Hosting sends those links to
// this function, which returns the app's own index.html with the khitma's title and progress in its tags.
// Group pages stay out of search engines (noindex): their titles often carry the names of the deceased.

const NUM_OF_AJZA = 30;
const DONE = 2;
const IDLE = 0;

/** "جزء واحد"، "جزءان"، "5 أجزاء"، "18 جزءًا" (as in the app's share messages). */
export function ajzaCount(count) {
  if (count === 1) return 'جزء واحد';
  if (count === 2) return 'جزءان';
  if (count >= 3 && count <= 10) return `${count} أجزاء`;
  return `${count} جزءًا`;
}

/** The preview's title and description for a group document. */
export function previewText(group) {
  const title = String(group?.title ?? '').trim().slice(0, 120) || 'ختمة.نت';
  const ajza = Array.isArray(group?.ajza) ? group.ajza : Object.values(group?.ajza ?? {});
  const sequential = !group?.type || group.type === 'SEQUENTIAL';
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
