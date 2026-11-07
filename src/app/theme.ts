/**
 * Light or dark. The app follows the phone (prefers-color-scheme) until someone picks the other look with the
 * toolbar button. The choice is kept on the phone, and picking the phone's own look again forgets it.
 *
 * The dark colours stay in `@media (prefers-color-scheme: dark)` blocks (_color-scheme.scss and the dark mixin in
 * _variables.scss), the ones the phone's dark mode turns on. A picked look switches those blocks always on or always
 * off by rewriting their condition, so it matches the phone's look exactly, and nothing changes without a choice.
 * (Under a selector instead, Material's dark colours would outrank the app's own ones in _material-compat.scss,
 * _theme.scss and the components, which win today by coming later.)
 * index.html applies the choice to the loading screen before the first paint; keep the two in step.
 */
export type Theme = 'light' | 'dark';

const KEY = 'theme';
const PHONE_DARK = '(prefers-color-scheme: dark)';
// A dark block's condition for each case: always on, never on, or the phone's. Only blocks with exactly one of these
// are switched, so one combined with another condition keeps it.
const CONDITION = {
  dark: `all, ${PHONE_DARK}`,
  light: `${PHONE_DARK} and (prefers-color-scheme: light)`,
  phone: PHONE_DARK,
};
const unspaced = (media: string) => media.replace(/\s+/g, '');
const DARK_BLOCK = new Set(Object.values(CONDITION).map(unspaced));

const phoneDark = window.matchMedia(PHONE_DARK);
let picked: Theme | null = savedTheme();

function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    // Storage can be off (private modes): the phone's look then.
    return null;
  }
}

function phoneTheme(): Theme {
  return phoneDark.matches ? 'dark' : 'light';
}

export function currentTheme(): Theme {
  return picked ?? phoneTheme();
}

export function setTheme(theme: Theme): void {
  picked = theme === phoneTheme() ? null : theme;
  try {
    if (picked) {
      localStorage.setItem(KEY, picked);
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    // Not kept, but still applied below.
  }
  apply();
}

/** When the phone switches between light and dark (the app follows it unless a look is picked). */
export function onPhoneThemeChange(callback: () => void): void {
  phoneDark.addEventListener('change', callback);
}

/** At the start, before the app shows (main.ts): the picked look on the styles there are and those to come. */
export function startTheme(): void {
  apply();
  // Components add their styles when they first show.
  new MutationObserver((records) =>
    records.forEach((record) =>
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLStyleElement) {
          switchDarkBlocks(node.sheet);
        }
      })
    )
  ).observe(document.head, { childList: true });
  // The full stylesheet can still be loading (index.html has most of it inline). With a look picked, it stays off
  // until its dark blocks are switched, so the phone's look doesn't flash in between.
  if (picked) {
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
      if (!link.sheet) {
        const media = link.media;
        link.media = 'print';
        link.addEventListener(
          'load',
          () => {
            switchDarkBlocks(link.sheet);
            link.media = media;
          },
          { once: true }
        );
      }
    });
  }
}

function apply(): void {
  const root = document.documentElement;
  if (picked) {
    root.setAttribute('data-theme', picked);
    // The browser's own parts (scrollbars, native lists) too; "only" also stops browsers from darkening it themselves.
    root.style.setProperty('color-scheme', picked === 'dark' ? 'dark' : 'only light');
  } else {
    root.removeAttribute('data-theme');
    root.style.removeProperty('color-scheme');
  }
  Array.from(document.styleSheets).forEach(switchDarkBlocks);
}

function switchDarkBlocks(sheet: CSSStyleSheet | null): void {
  let rules: CSSRuleList;
  try {
    rules = sheet.cssRules;
  } catch {
    // No sheet yet, or another site's (which has no dark blocks).
    return;
  }
  switchRules(rules, CONDITION[picked ?? 'phone']);
}

function switchRules(rules: CSSRuleList, condition: string): void {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule instanceof CSSMediaRule && DARK_BLOCK.has(unspaced(rule.media.mediaText))) {
      if (unspaced(rule.media.mediaText) !== unspaced(condition)) {
        rule.media.mediaText = condition;
      }
    } else if ((rule as CSSGroupingRule).cssRules) {
      // Inside @supports and the like.
      switchRules((rule as CSSGroupingRule).cssRules, condition);
    }
  }
}
