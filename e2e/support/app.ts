import { Page } from '@playwright/test';

/** Fixed clock for screenshots and dated share messages. */
export const FIXED_NOW = new Date('2026-03-01T09:00:00Z');

export interface OpenOptions {
  /** localStorage entries; non-string values are JSON-encoded like the app does. */
  storage?: Record<string, unknown>;
  freezeTime?: boolean;
}

/**
 * Opens the app with test hooks installed before it boots:
 * - analytics and external embeds (Quran reader, YouTube) are blocked,
 * - localStorage is seeded once per tab (reloads keep the app's own changes),
 * - navigator.share is captured in window.__shares.
 */
export async function openApp(page: Page, path: string, options: OpenOptions = {}): Promise<void> {
  await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|quranflash\.com|youtube\.com|youtube-nocookie\.com|ytimg\.com/, (route) =>
    route.abort()
  );
  if (options.freezeTime) {
    await page.clock.setFixedTime(FIXED_NOW);
  }
  const storage = Object.fromEntries(
    Object.entries(options.storage ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  );
  await page.addInitScript((seed: Record<string, string>) => {
    if (!sessionStorage.getItem('__e2eSeeded')) {
      for (const [key, value] of Object.entries(seed)) {
        localStorage.setItem(key, value);
      }
      sessionStorage.setItem('__e2eSeeded', '1');
    }
    (window as any).__shares = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: unknown) => {
        (window as any).__shares.push(data);
        return Promise.resolve();
      },
    });
  }, storage);
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

export async function sharedPayloads(page: Page): Promise<Array<{ title?: string; text?: string; url?: string }>> {
  return page.evaluate(() => (window as any).__shares);
}

export async function readLocalStorage(page: Page, key: string): Promise<any> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  return raw === null ? null : JSON.parse(raw);
}
