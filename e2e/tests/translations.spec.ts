import { expect, Page, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { joinedGroups, openApp, OUTSIDE_RAMADAN, sharedPayloads } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Arabic is the source; English, French, German and Spanish come from src/assets/translate. A key missing from a
// file shows up as the key itself ("me.archive") wherever the [translate] directive uses it, so these checks keep
// the five files in step, and the screens free of Arabic interface text in the other languages.

const LANGS = ['ar', 'en', 'fr', 'de', 'es'] as const;
const TRANSLATED = ['en', 'fr', 'de', 'es'] as const;
// Sentences Arabic builds in code (for its plural forms), so only the other languages have them.
const ONLY_TRANSLATED = new Set(['referral.joined', 'referral.read', 'referral.started']);
// Arabic quotes the hadith itself; the other languages add its meaning.
const EMPTY_IN_ARABIC = new Set(['sharing.hadithMeaning']);

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(value).reduce<Record<string, unknown>>((all, [key, item]) => {
    if (item && typeof item === 'object') {
      Object.assign(all, flatten(item as Record<string, unknown>, `${prefix}${key}.`));
    } else {
      all[prefix + key] = item;
    }
    return all;
  }, {});
}

const files = Object.fromEntries(
  LANGS.map((lang) => [lang, flatten(JSON.parse(readFileSync(join(__dirname, `../../src/assets/translate/${lang}.json`), 'utf8')))])
) as Record<(typeof LANGS)[number], Record<string, unknown>>;

const placeholders = (text: unknown) => [...new Set(String(text).match(/\{\w+\}/g) ?? [])].sort().join(' ');

function templateKeys(dir = join(__dirname, '../../src/app'), keys = new Set<string>()): Set<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      templateKeys(path, keys);
    } else if (name.endsWith('.html')) {
      for (const match of readFileSync(path, 'utf8').matchAll(/\[translate\]="'([^']+)'"/g)) {
        keys.add(match[1]);
      }
    }
  }
  return keys;
}

test.describe('translation files', () => {
  test('every key the pages use is in all five languages', () => {
    const missing = [...templateKeys()].flatMap((key) => LANGS.filter((lang) => !(key in files[lang])).map((lang) => `${lang}: ${key}`));
    expect(missing).toEqual([]);
  });

  test('the five languages have the same keys', () => {
    const all = new Set(LANGS.flatMap((lang) => Object.keys(files[lang])));
    const missing = [...all].flatMap((key) =>
      LANGS.filter((lang) => !(key in files[lang]) && !(lang === 'ar' && ONLY_TRANSLATED.has(key))).map((lang) => `${lang}: ${key}`)
    );
    expect(missing).toEqual([]);
  });

  test('translations keep the placeholders, and have no Arabic left in them and nothing empty', () => {
    const problems: string[] = [];
    for (const [key, english] of Object.entries(files.en)) {
      for (const lang of TRANSLATED) {
        const value = files[lang][key];
        if (typeof value !== 'string') continue;
        if (placeholders(value) !== placeholders(english)) problems.push(`${lang} ${key}: "${placeholders(value)}" instead of "${placeholders(english)}"`);
        if (/[\u0600-\u06FF]/.test(value)) problems.push(`${lang} ${key}: Arabic letters`);
        if (!value.trim()) problems.push(`${lang} ${key}: empty`);
      }
    }
    for (const [key, value] of Object.entries(files.ar)) {
      if (typeof value === 'string' && !value.trim() && !EMPTY_IN_ARABIC.has(key)) problems.push(`ar ${key}: empty`);
    }
    expect(problems).toEqual([]);
  });
});

/** Arabic, or translation keys, in the page's text; quoted Arabic (marked lang="ar", like the guides' titles) aside. */
async function untranslatedTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      if (!text || node.parentElement?.closest('script, style, noscript, [lang="ar"]')) continue;
      if (/[\u0600-\u06FF]/.test(text) || /^[a-z][A-Za-z]*(\.[A-Za-z_]+)+$/.test(text)) found.push(text);
    }
    return found;
  });
}

test.describe('the app in English', () => {
  // Names and titles in Latin letters, so any Arabic left on a screen is the app's own text.
  const ADMIN = 'Ahmad';
  const { BOOKED, DONE } = JUZ_STATUS;
  let groupId: string;
  let doneId: string;

  test.beforeAll(async () => {
    groupId = newGroupId('english');
    doneId = newGroupId('english-done');
    await createSequentialGroup(groupId, {
      title: 'Family khitma',
      author: ADMIN,
      // As saved when the date is picked: the Arabic text, and the date itself for other languages.
      targetDate: 'الجمعة 30/1/2026',
      targetAt: '2026-01-30',
      assigned: { 1: { owner: 'Sara', status: DONE }, 2: { owner: 'Omar', status: BOOKED } },
    });
    const all = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { owner: ADMIN, status: DONE }]));
    await createSequentialGroup(doneId, { title: 'Khitma for Fatima', author: ADMIN, purpose: 'memorial', honoreeGender: 'female', assigned: all });
  });

  const screens: Array<[string, () => string, string | null, string]> = [
    ['home', () => '/', null, 'Create a recurring khitma group'],
    ['the create form', () => '/new', null, 'Recurring khitma group'],
    ['the one-time create form', () => '/new?type=onetime', null, 'One-time group khitma'],
    ['the join page', () => `/group/${groupId}`, null, 'Join the khitma'],
    ['a member’s group page', () => `/group/${groupId}`, 'Sara', 'As-salamu alaykum, Sara'],
    ['the admin’s group page', () => `/group/${groupId}`, ADMIN, 'As-salamu alaykum, Ahmad'],
    ['a completed memorial khitma', () => `/group/${doneId}`, ADMIN, 'Supplication for the deceased'],
    ['my groups', () => '/me/groups', ADMIN, 'My current groups'],
    ['about', () => '/about', null, 'How to use'],
  ];

  for (const [name, path, username, shown] of screens) {
    test(`${name}: no Arabic interface text`, async ({ page }) => {
      const storage: Record<string, unknown> = { lng: 'en', lastRecievedNotificationId: '2' };
      if (username) storage.groups = joinedGroups({ [groupId]: username, [doneId]: username });
      await openApp(page, path(), { storage, now: OUTSIDE_RAMADAN });
      await expect(page.getByText(shown, { exact: false }).first()).toBeVisible();
      if (username === ADMIN && path() === `/group/${groupId}`) {
        await page.getByText('Group admin tools').click();
        await expect(page.getByRole('button', { name: 'Share the khitma status' })).toBeVisible();
      }
      await expect.poll(() => untranslatedTexts(page)).toEqual([]);
    });
  }

  test('the status message an admin shares is in English', async ({ page }) => {
    await openApp(page, `/group/${groupId}`, {
      storage: { lng: 'en', groups: joinedGroups({ [groupId]: ADMIN }), lastRecievedNotificationId: '2' },
      now: OUTSIDE_RAMADAN,
    });
    await page.getByText('Group admin tools').click();
    await page.getByRole('button', { name: 'Share the khitma status' }).click();

    const shared = (await sharedPayloads(page))[0];
    expect(shared.title).toBe('Khitma status: Family khitma');
    const lines = shared.text!.split('\n');
    expect(lines[1]).toBe('Friday, 1/23/2026');
    expect(lines[3]).toBe('🟢 Read 1 · 🟡 Being read 1 · 🔴 Free 28');
    expect(lines[4]).toBe('Free juz: ' + Array.from({ length: 28 }, (_, i) => i + 3).join(', '));
    expect(shared.text).toContain('Khitma due: Friday, 1/30/2026.');
    expect(shared.text).toContain(`Please update the status of your juz through the link: http://localhost:4300/group/${groupId}`);
    expect(shared.text).toMatch(/May Allah bless you!$/);
    expect(shared.text).not.toMatch(/[\u0600-\u06FF]/);
  });
});
