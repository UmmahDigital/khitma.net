import { Browser, expect, Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { joinedGroups, openApp, OUTSIDE_RAMADAN, openedUrls, whatsappText } from '../support/app';
import { createSequentialGroup, JUZ_STATUS, newGroupId } from '../support/fixtures';

// Urdu, Indonesian, Malay, Turkish and Bengali (added in 2026): Urdu reads right to left; each language has a page
// that leads into the app in it (/ur/, /tr/…); and a newcomer gets their phone's, or that of the link someone shared
// in it, unless their phone speaks Arabic or has opened the app before.

const NEW = ['ur', 'id', 'ms', 'tr', 'bn'];
const CLUSTER = ['ar', 'en', 'fr', 'es', 'de', ...NEW];
const { BOOKED } = JUZ_STATUS;

const files: Record<string, any> = Object.fromEntries(
  CLUSTER.map((lang) => [lang, JSON.parse(readFileSync(join(__dirname, `../../src/assets/translate/${lang}.json`), 'utf8'))])
);
const t = (lang: string, path: string): string => path.split('.').reduce((value, key) => value?.[key], files[lang]);

/** The language picked on this phone (a plain string, not JSON). */
const storedLanguage = (page: Page) => page.evaluate(() => localStorage.getItem('lng'));
const pageLanguage = (page: Page) => page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);

/** A new phone: its language, and optionally the list of languages it says it speaks. */
async function phone(browser: Browser, locale: string, languages?: string[]): Promise<Page> {
  const context = await browser.newContext({ locale, timezoneId: 'Asia/Jerusalem' });
  if (languages) {
    await context.addInitScript((list) => Object.defineProperty(navigator, 'languages', { get: () => list }), languages);
  }
  return context.newPage();
}

test.describe('the five new languages', () => {
  test('Urdu reads right to left; the others left to right', async ({ page }) => {
    await openApp(page, '/', { storage: { lng: 'ur', lastRecievedNotificationId: '2' }, now: OUTSIDE_RAMADAN });
    await expect(page.getByText(t('ur', 'home.creatA'))).toBeVisible();
    expect(await pageLanguage(page)).toEqual(['ur', 'rtl']);
    await expect(page.locator('body')).toHaveClass(/\brtl\b/);

    for (const lang of ['id', 'ms', 'tr', 'bn']) {
      await page.evaluate((code) => localStorage.setItem('lng', code), lang);
      await page.reload();
      await expect(page.getByText(t(lang, 'home.creatA'))).toBeVisible();
      expect(await pageLanguage(page)).toEqual([lang, 'ltr']);
    }
  });

  test('counts ajza in the reader’s language in what they share', async ({ page }) => {
    const groupId = newGroupId('lang-count');
    await createSequentialGroup(groupId, { title: 'Hatim', author: 'Ahmet', assigned: { 1: { owner: 'Ayşe', status: BOOKED } } });
    await openApp(page, `/group/${groupId}`, { storage: { lng: 'tr', groups: joinedGroups({ [groupId]: 'Ayşe' }) } });
    await page.locator('.help-finish').getByRole('button').click();
    expect(whatsappText((await openedUrls(page))[0])).toContain('29 cüz');
  });
});

test.describe('without a language of their own', () => {
  test('a first visit takes a Turkish phone’s language and keeps it; a phone in English, or that also speaks Arabic, gets Arabic', async ({ browser }) => {
    const turkish = await phone(browser, 'tr-TR');
    await openApp(turkish, '/', { now: OUTSIDE_RAMADAN, storage: { lastRecievedNotificationId: '2' } });
    await expect(turkish.getByText(t('tr', 'home.creatA'))).toBeVisible();
    expect(await storedLanguage(turkish)).toBe('tr');

    for (const [locale, languages] of [['en-US', undefined], ['tr-TR', ['tr-TR', 'ar']]] as const) {
      const other = await phone(browser, locale, languages ? [...languages] : undefined);
      await openApp(other, '/', { now: OUTSIDE_RAMADAN, storage: { lastRecievedNotificationId: '2' } });
      await expect(other.getByText(t('ar', 'home.creatA'))).toBeVisible();
      expect(await pageLanguage(other)).toEqual(['ar', 'rtl']);
      expect(await storedLanguage(other)).toBe('ar');
      await other.context().close();
    }
    await turkish.context().close();
  });

  test('a phone that used the app before keeps its Arabic, whatever its language or the link', async ({ browser }) => {
    const groupId = newGroupId('lang-before');
    await createSequentialGroup(groupId, { author: 'Bilal' });
    // What the app has written on every first visit since 2021 (local-database.service.ts), without a language.
    const personalKhitma = Array.from({ length: 30 }, (_, index) => ({ index, status: 0 }));

    const before = await phone(browser, 'tr-TR');
    await openApp(before, `/group/${groupId}?hl=ur`, { storage: { personalKhitma, lastRecievedNotificationId: '2' } });
    await expect(before.getByRole('button', { name: t('ar', 'gJoin.join') })).toBeVisible();
    expect(await pageLanguage(before)).toEqual(['ar', 'rtl']);
    expect(await storedLanguage(before)).toBe('ar');
    await before.context().close();
  });

  test('a link shared in Urdu opens in Urdu for a reader whose phone is in English, and only for them', async ({ page, browser }) => {
    const groupId = newGroupId('lang-hint');
    await createSequentialGroup(groupId, { author: 'Bilal' });

    // The organiser shares from the app in Urdu: the link carries the language.
    await openApp(page, `/group/${groupId}/invite`, { storage: { lng: 'ur', refCode: 'urshare01' } });
    const message = page.getByRole('textbox');
    await expect(message).toHaveValue(new RegExp(`/group/${groupId}\\?r=urshare01&hl=ur`));
    const link = `/group/${groupId}?r=urshare01&hl=ur`;

    const english = await phone(browser, 'en-US');
    await openApp(english, link);
    await expect(english.getByRole('button', { name: t('ur', 'gJoin.join') })).toBeVisible();
    expect(await pageLanguage(english)).toEqual(['ur', 'rtl']);
    expect(await storedLanguage(english)).toBe('ur');

    const arabic = await phone(browser, 'ar');
    await openApp(arabic, link);
    await expect(arabic.getByRole('button', { name: t('ar', 'gJoin.join') })).toBeVisible();
    expect(await storedLanguage(arabic)).toBe('ar');

    const chose = await phone(browser, 'en-US');
    await openApp(chose, link, { storage: { lng: 'en' } });
    await expect(chose.getByRole('button', { name: t('en', 'gJoin.join') })).toBeVisible();

    await Promise.all([english, arabic, chose].map((other) => other.context().close()));
  });
});
