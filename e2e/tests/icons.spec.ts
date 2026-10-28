import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApp } from '../support/app';

// The icon font holds only the icons the app uses (tools/icons/update-icon-font.mjs). An icon missing from it shows
// up as its name in letters ("share"), so every icon in the templates must be in the font's list.

const root = join(__dirname, '../..');

function iconsUsedInTemplates(): string[] {
  const names = new Set<string>();
  const dir = join(root, 'src/app');
  for (const file of readdirSync(dir, { recursive: true }) as string[]) {
    if (!file.endsWith('.html')) continue;
    const html = readFileSync(join(dir, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const [, content] of html.matchAll(/<mat-icon\b[^>]*>([\s\S]*?)<\/mat-icon\s*>/g)) {
      const text = content.trim();
      if (/^[a-z0-9_]+$/.test(text)) names.add(text);
      for (const [, quoted] of text.matchAll(/["']([a-z0-9_]+)["']/g)) names.add(quoted);
    }
  }
  return [...names].sort();
}

test('every icon the templates use is in the icon font', () => {
  const inFont = readFileSync(join(root, 'src/assets/fonts/material-symbols-outlined.icons.txt'), 'utf8').trim().split('\n');
  const missing = iconsUsedInTemplates().filter((name) => !inFont.includes(name));
  expect(missing, 'Run: node tools/icons/update-icon-font.mjs').toEqual([]);
});

test('icons come from the small font and render as icons, not words', async ({ page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com\/.*(icon|materialicons|Material)/i.test(request.url())) fontRequests.push(request.url());
  });
  await openApp(page, '/');
  const menu = page.locator('mat-toolbar mat-icon').first();
  await expect(menu).toHaveText('menu');
  await expect(menu).toHaveClass(/material-symbols-outlined/);
  // A ligature draws one 24px glyph; a missing icon would draw the word "menu".
  await expect.poll(async () => (await menu.boundingBox())!.width).toBeLessThanOrEqual(26);
  expect(fontRequests).toEqual([]);
});
