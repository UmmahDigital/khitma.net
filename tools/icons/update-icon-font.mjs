// Builds the app's icon font: Material Symbols Outlined with only the icons the app uses (about 5 kB instead of the
// 155 kB full font). Run it after using a new icon:   node tools/icons/update-icon-font.mjs
// The e2e test icons.spec.ts fails when a template uses an icon that isn't in the font.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fonts = join(root, 'src/assets/fonts');

/** Icon names in <mat-icon> elements, including names picked in an expression, e.g. {{ open ? "expand_less" : "expand_more" }}. */
export async function iconsUsedInTemplates() {
  const names = new Set();
  for (const file of await readdir(join(root, 'src/app'), { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    const html = (await readFile(join(root, 'src/app', file), 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
    for (const [, content] of html.matchAll(/<mat-icon\b[^>]*>([\s\S]*?)<\/mat-icon\s*>/g)) {
      const text = content.trim();
      if (/^[a-z0-9_]+$/.test(text)) names.add(text);
      for (const [, quoted] of text.matchAll(/["']([a-z0-9_]+)["']/g)) names.add(quoted);
    }
  }
  return [...names].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const names = await iconsUsedInTemplates();
  const cssUrl =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0' +
    `&icon_names=${names.join(',')}&display=block`;
  // Google Fonts serves woff2 only to browsers it knows support it.
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const css = await (await fetch(cssUrl, { headers: { 'user-agent': userAgent } })).text();
  const fontUrl = css.match(/src: url\((https:[^)]+)\) format\('woff2'\)/)?.[1];
  if (!fontUrl) throw new Error(`No woff2 in Google Fonts response:\n${css}`);
  const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
  await writeFile(join(fonts, 'material-symbols-outlined.woff2'), font);
  await writeFile(join(fonts, 'material-symbols-outlined.icons.txt'), names.join('\n') + '\n');
  console.log(`${names.length} icons, ${font.length} bytes: ${names.join(' ')}`);
}
