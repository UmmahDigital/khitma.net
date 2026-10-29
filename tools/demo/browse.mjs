// Opens the local demo (`npm run demo`) in a phone-sized browser whose clock reads another date, to see what depends
// on it: the Ramadan card and templates (mid-Sha'ban to the end of Ramadan), the "continue weekly after Eid?"
// question (from the 20th of Ramadan), countdowns.
//
//   npm run demo:browse -- 2027-02-20                      the home page on that day
//   npm run demo:browse -- 2027-03-01 /group/demo-ramadan  continue as «أبو أحمد» to see the question
//
// The browser starts empty (no joined groups) and closes with its window. Only the page's clock moves: the emulator's
// timestamps stay real, so bookings made today look months old from 2027.
import { chromium, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export const DEMO_SITE = 'http://localhost:4201';

/** A date ("2027-02-20" is taken at local noon) or a full date and time. */
export function parseDate(text) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not a date: ${text} (use YYYY-MM-DD)`);
  }
  return date;
}

export async function openAt(date, path = '/', { headless = false } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  await context.clock.setFixedTime(date);
  const page = await context.newPage();
  await page.goto(new URL(path, DEMO_SITE).href);
  return { browser, page };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dateText, path = '/'] = process.argv.slice(2);
  if (!dateText) {
    console.error('Usage: npm run demo:browse -- YYYY-MM-DD [/path]');
    process.exit(1);
  }
  const date = parseDate(dateText);
  const { browser, page } = await openAt(date, path);
  console.log(`Browsing ${DEMO_SITE}${path} as of ${date.toString()}. Close the window to stop.`);
  await page.waitForEvent('close', { timeout: 0 });
  await browser.close();
}
