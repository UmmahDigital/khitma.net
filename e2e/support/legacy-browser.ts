import { Page } from '@playwright/test';

/**
 * Makes Chromium run the app like the oldest phones in .browserslistrc (Safari/iOS 14.5).
 *
 * esbuild already lowers JavaScript syntax for those targets, but it does not polyfill APIs or
 * rewrite CSS, so this covers what it leaves behind:
 * - JavaScript APIs that shipped after Safari 14.1 are removed before the app boots;
 * - CSS those browsers drop is renamed so Chromium drops it the same way: whole `@layer` blocks,
 *   rules whose selector uses `:has()` or `:focus-visible`, and `color-mix()` values (custom
 *   properties holding one become invalid where they are used, as in an old browser).
 */
export async function simulateOldestSupportedBrowser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const remove = (owner: any, names: string[]) => names.forEach((name) => delete owner[name]);
    remove(globalThis, ['structuredClone', 'BroadcastChannel', 'requestIdleCallback', 'cancelIdleCallback']);
    remove(Object, ['hasOwn', 'groupBy']);
    remove(Map, ['groupBy']);
    remove(Promise, ['withResolvers']);
    remove(Array, ['fromAsync']);
    remove(Array.prototype, ['at', 'findLast', 'findLastIndex', 'toSorted', 'toReversed', 'toSpliced', 'with']);
    remove(String.prototype, ['at', 'isWellFormed', 'toWellFormed']);
    remove(Set.prototype, ['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom']);
    remove(AbortSignal, ['any', 'timeout']);
    remove(URL, ['canParse']);
    remove(Crypto.prototype, ['randomUUID']);
    remove(HTMLElement.prototype, ['popover', 'showPopover', 'hidePopover', 'togglePopover']);
    remove(Element.prototype, ['checkVisibility']);
  });
  await page.route(/\/(main|polyfills|chunk|styles)-\w+\.(js|css)$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/color-mix\(/g, 'x-color-mix(')
      .replace(/@layer\b/g, '@x-layer')
      .replace(/:has\(/g, ':x-has(')
      .replace(/:focus-visible\b/g, ':x-focus-visible');
    await route.fulfill({ response, body });
  });
}
