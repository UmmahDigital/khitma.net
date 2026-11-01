// Tells search engines that use IndexNow (Bing, Yandex, Seznam, Naver…) about every page in the sitemap, so new and
// changed pages are crawled within days instead of weeks. Run it after a deploy that adds or changes public pages:
//   node tools/seo/indexnow.mjs            (add --dry-run to only list the pages)
// The key is the name and content of the file src/<key>.txt, served at https://khitma.net/<key>.txt, which proves
// the site sent the list. Google doesn't use IndexNow: it reads the sitemap (submit it once in Search Console).
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const HOST = 'khitma.net';

const keyFile = readdirSync(join(root, 'src')).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) {
  throw new Error('No IndexNow key file (src/<32 hex characters>.txt)');
}
const key = readFileSync(join(root, 'src', keyFile), 'utf8').trim();
const sitemap = readFileSync(join(root, 'src/sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

if (process.argv.includes('--dry-run')) {
  console.log(urlList.join('\n'));
  console.log(`\n${urlList.length} pages, key ${key}`);
  process.exit(0);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList }),
});
// 200: received. 202: received, the key is still being checked. 403: the key file isn't on the site (deploy first).
console.log(`${response.status} ${response.statusText}: ${urlList.length} pages`);
process.exit(response.ok ? 0 : 1);
