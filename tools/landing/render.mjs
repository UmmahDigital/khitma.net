// The language pages (khitma.net/en/, /ur/, /tr/…): plain HTML that search engines and AI assistants read without
// JavaScript, each leading into the app in its language (?lang=, read by index.html before the app starts).
// Arabic is the site's root (/), the app itself. Render after editing tools/landing/content:
//   node tools/landing/render.mjs
// The pages link to each other (hreflang); the sitemap lists the same alternates for the root, which as the app's
// shell can't carry them itself (index.html is served for every route).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SITE = 'https://khitma.net';

/** As in src/app/languages.ts, without Arabic (the root). */
export const PAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr' },
];

export const pageUrl = (code) => (code === 'ar' ? `${SITE}/` : `${SITE}/${code}/`);

// Arabic's page is the app itself, which keeps the language someone already has: ?lang=ar makes it Arabic.
const languageLink = (code) => (code === 'ar' ? '/?lang=ar' : `/${code}/`);

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(page, content) {
  const { code, dir } = page;
  const brand = code === 'ur' ? 'ختمة.نت' : 'Khitma.net';
  const url = pageUrl(code);
  const appLink = (query) => `/new?${query}&amp;lang=${code}&amp;from=landing_${code}`;
  const alternates = [
    `<link rel="alternate" hreflang="ar" href="${pageUrl('ar')}">`,
    ...PAGES.map((other) => `<link rel="alternate" hreflang="${other.code}" href="${pageUrl(other.code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl('ar')}">`,
  ];
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: content.title,
        description: content.description,
        inLanguage: code,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/#app` },
      },
      {
        '@type': 'FAQPage',
        inLanguage: code,
        mainEntity: content.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
  const others = [{ code: 'ar', name: 'العربية', dir: 'rtl' }, ...PAGES].filter((other) => other.code !== code);

  return `<!doctype html>
<html lang="${code}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(content.title)}</title>
  <meta name="description" content="${escape(content.description)}">
  <link rel="canonical" href="${url}">
  ${alternates.join('\n  ')}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${brand}">
  <meta property="og:locale" content="${content.locale}">
  <meta property="og:title" content="${escape(content.title)}">
  <meta property="og:description" content="${escape(content.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/og/default.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/icons/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Markazi+Text:wght@400;700&display=swap">
  <link rel="stylesheet" href="/guide/guide.css">
  <script type="application/ld+json">
${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}
  </script>
</head>
<body>
  <header class="site-header">
    <a href="/?lang=${code}"><img src="/assets/khitma-logo.png" width="40" height="40" alt="">${brand}</a>
  </header>
  <main>
    <h1>${escape(content.h1)}</h1>
    <p class="lead">${escape(content.lead)}</p>
    <a class="cta" href="${appLink('type=onetime')}">${escape(content.start)}</a>
    <a class="cta secondary" href="${appLink('type=recurring')}">${escape(content.startRecurring)}</a>

    <h2>${escape(content.howTitle)}</h2>
    <ol>
${content.steps.map((step) => `      <li>${escape(step)}</li>`).join('\n')}
    </ol>

    <h2>${escape(content.featuresTitle)}</h2>
${content.features.map((feature) => `    <h3>${escape(feature.title)}</h3>\n    <p>${escape(feature.text)}</p>`).join('\n')}

    <h2>${escape(content.faqTitle)}</h2>
${content.faq.map((item) => `    <details>\n      <summary>${escape(item.q)}</summary>\n      <p>${escape(item.a)}</p>\n    </details>`).join('\n')}

    <p class="note">${escape(content.about)}</p>
    <a class="cta" href="/?lang=${code}">${escape(content.openApp)}</a>

    <nav class="more-guides" aria-label="${escape(content.otherLanguages)}">
      <h2>${escape(content.otherLanguages)}</h2>
      <ul>
${others.map((other) => `        <li><a href="${languageLink(other.code)}" hreflang="${other.code}" lang="${other.code}" dir="${other.dir}">${other.name}</a></li>`).join('\n')}
      </ul>
    </nav>
  </main>
  <footer>${brand}: ${escape(content.h1)}</footer>
</body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const english = JSON.parse(readFileSync(join(root, 'tools/landing/content/en.json'), 'utf8'));
  const shape = (value) =>
    Array.isArray(value) ? value.map(shape) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value;
  for (const page of PAGES) {
    const content = JSON.parse(readFileSync(join(root, 'tools/landing/content', `${page.code}.json`), 'utf8'));
    if (JSON.stringify(shape(content)) !== JSON.stringify(shape(english)) || content.lang !== page.code) {
      throw new Error(`tools/landing/content/${page.code}.json doesn't have the shape of en.json (check: node tools/i18n/check.mjs ${page.code} --landing)`);
    }
    const dir = join(root, 'src/landing', page.code);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), render(page, content));
    console.log(`src/landing/${page.code}/index.html`);
  }
  writeFileSync(join(root, 'src/sitemap.xml'), sitemap());
  console.log('src/sitemap.xml');
}

/**
 * Every public page: the root and the language pages with their alternates (the root's only hreflang, see above),
 * the app's public screens, and the guides (each folder of src/guide).
 */
function sitemap() {
  const cluster = ['ar', ...PAGES.map((page) => page.code)];
  const alternates = [
    ...cluster.map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${pageUrl(code)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('ar')}"/>`,
  ].join('\n');
  const guides = readdirSync(join(root, 'src/guide'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, 'src/guide', entry.name, 'index.html')))
    .map((entry) => entry.name)
    .sort();
  const urls = [
    ...cluster.map((code) => `  <url>\n    <loc>${pageUrl(code)}</loc>\n${alternates}\n  </url>`),
    ...['/new', '/about', '/aqsa', '/quran'].map((path) => `  <url><loc>${SITE}${path}</loc></url>`),
    ...(existsSync(join(root, 'src/guide/index.html')) ? [`  <url><loc>${SITE}/guide/</loc></url>`] : []),
    ...guides.map((slug) => `  <url><loc>${SITE}/guide/${slug}/</loc></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Written by tools/landing/render.mjs. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}
