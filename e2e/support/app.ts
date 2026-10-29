import { expect, Locator, Page, test } from '@playwright/test';
import { simulateOldestSupportedBrowser } from './legacy-browser';

/** Fixed clock for screenshots and dated share messages: a Sunday, and the 12th of Ramadan 1447. */
export const FIXED_NOW = new Date('2026-03-01T09:00:00Z');
/** A fixed clock outside the Ramadan season (a Friday in Sha'ban's first half), for the home page's usual look. */
export const OUTSIDE_RAMADAN = new Date('2026-01-23T09:00:00Z');

export interface OpenOptions {
  /** localStorage entries; non-string values are JSON-encoded like the app does. */
  storage?: Record<string, unknown>;
  freezeTime?: boolean;
  /** A fixed clock at another moment than FIXED_NOW (which falls in Ramadan 1447). */
  now?: Date;
  /** false: a browser without a share sheet (desktop Firefox, some in-app browsers). */
  shareSheet?: boolean;
}

/**
 * Opens the app with test hooks installed before it boots:
 * - analytics and external embeds (Quran reader, YouTube) are blocked,
 * - localStorage is seeded once per tab (reloads keep the app's own changes),
 * - navigator.share is captured in window.__shares (or absent, with shareSheet: false),
 * - window.open (WhatsApp links) is captured in window.__opened, and copied text in window.__copied,
 * - in the `oldest-supported-browser` project, Chromium is made to behave like the oldest phones we support.
 */
export async function openApp(page: Page, path: string, options: OpenOptions = {}): Promise<void> {
  if (test.info().project.metadata?.oldestSupportedBrowser) {
    await simulateOldestSupportedBrowser(page);
  }
  await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|quranflash\.com|youtube\.com|youtube-nocookie\.com|ytimg\.com/, (route) =>
    route.abort()
  );
  if (options.freezeTime || options.now) {
    await page.clock.setFixedTime(options.now ?? FIXED_NOW);
  }
  const storage = Object.fromEntries(
    Object.entries(options.storage ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  );
  await page.addInitScript(({ seed, shareSheet }: { seed: Record<string, string>; shareSheet: boolean }) => {
    if (!sessionStorage.getItem('__e2eSeeded')) {
      for (const [key, value] of Object.entries(seed)) {
        localStorage.setItem(key, value);
      }
      sessionStorage.setItem('__e2eSeeded', '1');
    }
    (window as any).__shares = [];
    (window as any).__sharedFiles = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareSheet
        ? (data: any) => {
            const files: File[] = Array.from(data?.files ?? []);
            (window as any).__sharedFiles.push(...files);
            (window as any).__shares.push(
              files.length ? { ...data, files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) } : data
            );
            return Promise.resolve();
          }
        : undefined,
    });
    // A share sheet that takes files, like phones since iOS 15 and Android.
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: shareSheet ? () => true : undefined });
    (window as any).__opened = [];
    window.open = ((url?: string | URL) => {
      (window as any).__opened.push(String(url));
      return null;
    }) as typeof window.open;
    (window as any).__copied = [];
    document.addEventListener('copy', () => {
      const el = document.activeElement as HTMLTextAreaElement | null;
      const text = el && 'value' in el ? el.value.substring(el.selectionStart, el.selectionEnd) : String(getSelection());
      (window as any).__copied.push(text);
    });
  }, { seed: storage, shareSheet: options.shareSheet ?? true });
  await page.goto(path);
}

/** The `groups` localStorage entry for a user who joined the given groups (id -> name). */
export function joinedGroups(entries: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entries).map(([id, username], i) => [
      id,
      { isJoined: true, username, joinTimestamp: 1_700_000_000_000 + i },
    ])
  );
}

/** A file the app shared (the last one by default), as PNG/JPEG bytes and its pixel size. */
export async function sharedImage(page: Page, index = -1): Promise<{ bytes: Buffer; width: number; height: number }> {
  const { base64, width, height } = await page.evaluate(async (at) => {
    const files: File[] = (window as any).__sharedFiles;
    const file = files[at < 0 ? files.length + at : at];
    const bitmap = await createImageBitmap(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return { base64: btoa(binary), width: bitmap.width, height: bitmap.height };
  }, index);
  return { bytes: Buffer.from(base64, 'base64'), width, height };
}

export async function sharedPayloads(page: Page): Promise<Array<{ title?: string; text?: string; url?: string; files?: Array<{ name: string; type: string; size: number }> }>> {
  return page.evaluate(() => (window as any).__shares);
}

export async function readLocalStorage(page: Page, key: string): Promise<any> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  return raw === null ? null : JSON.parse(raw);
}

/**
 * Opens a Material menu and taps one of its items. While the menu animates open (~120ms) Material
 * turns off pointer events on it, so a tap that soon is lost; people never tap that fast, tests do.
 */
export async function chooseMenuItem(page: Page, trigger: Locator, item: string): Promise<void> {
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect
    .poll(() => menu.evaluate((panel) => panel.getAnimations().every((a) => a.playState === 'finished')))
    .toBe(true);
  await menu.getByRole('menuitem', { name: item }).click();
}

/** Phone user agents for checking the update screen's per-platform advice. */
export const OLD_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 6.0.1; SM-J510F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.1 Chrome/75.0.3770.143 Mobile Safari/537.36';
export const OLD_IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';

/** Loads the app like a browser too old to parse its code: the main bundle throws a SyntaxError. */
export async function openInTooOldBrowser(page: Page): Promise<void> {
  await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (route) => route.abort());
  await page.route(/\/main-\w+\.js$/, (route) => route.fulfill({ contentType: 'text/javascript', body: 'let unparsable = ;' }));
  await page.goto('/');
}

/** Analytics events queued through gtag(), as [name, params]. */
export async function analyticsEvents(page: Page): Promise<Array<[string, unknown]>> {
  return page.evaluate(() =>
    ((window as any).dataLayer ?? []).filter((args: any) => args[0] === 'event').map((args: any) => [args[1], args[2]])
  );
}

/**
 * Keeps every analytics event in sessionStorage, so events sent just before the app reloads itself (joining a group
 * does) can still be checked. Call before openApp.
 */
export async function recordEventsAcrossReloads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const saved: unknown[][] = JSON.parse(sessionStorage.getItem('__events') || '[]');
    const dataLayer: any[] = ((window as any).dataLayer = (window as any).dataLayer || []);
    const push = dataLayer.push.bind(dataLayer);
    dataLayer.push = (...calls: any[]) => {
      for (const call of calls) {
        const args = Array.from(call as ArrayLike<unknown>);
        if (args[0] === 'event') {
          saved.push(args.slice(1));
          sessionStorage.setItem('__events', JSON.stringify(saved));
        }
      }
      return push(...calls);
    };
  });
}

/** Events recorded by recordEventsAcrossReloads, as [name, params]. */
export async function recordedEvents(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__events') || '[]'));
}

/** Pages the app opened in a new tab (WhatsApp links). */
export async function openedUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__opened);
}

/** The text of a wa.me link the app opened. */
export function whatsappText(url: string): string {
  expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
  return new URL(url).searchParams.get('text')!;
}

/** Text the app copied to the clipboard. */
export async function copiedTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__copied);
}
