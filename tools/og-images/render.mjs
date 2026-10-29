// Renders the link-preview images (1200x630 JPEG) from the HTML templates in this folder.
// Usage: node tools/og-images/render.mjs   (needs network for the Google font)
import { chromium } from '@playwright/test';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = fileURLToPath(new URL('../../src/assets/og/', import.meta.url));
const only = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const file of (await readdir(here)).filter((f) => f.endsWith('.html'))) {
  const name = file.replace(/\.html$/, '');
  if (only.length && !only.includes(name)) continue;
  await page.goto(pathToFileURL(join(here, file)).href, { waitUntil: 'networkidle' });
  // Wait for the fonts the text needs, or the screenshot falls back to whatever this machine has installed.
  const missing = await page.evaluate(async () => {
    const texts = [...document.querySelectorAll('h1, h2, p, span, div')].filter((el) => el.textContent.trim());
    const font = (el) => {
      const style = getComputedStyle(el);
      return `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    };
    await Promise.all(texts.map((el) => document.fonts.load(font(el), el.textContent)));
    await document.fonts.ready;
    return texts.filter((el) => !document.fonts.check(font(el), el.textContent)).map((el) => el.textContent.trim());
  });
  if (missing.length) throw new Error(`Fonts not loaded for: ${missing.join(' | ')}`);
  const target = join(out, `${name}.jpg`);
  await page.screenshot({ path: target, type: 'jpeg', quality: 82 });
  console.log(`${target} ${(await stat(target)).size} bytes`);
}
await browser.close();
