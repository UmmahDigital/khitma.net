/**
 * The text size people pick in the menu, kept on the phone. It sets the root's font size (styles.scss), which every
 * text size follows (text() in _variables.scss); index.html applies the saved size before the first paint.
 */
export const TEXT_SIZES = ['s', 'm', 'l', 'xl'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

const KEY = 'textSize';
const DEFAULT: TextSize = 'm';

export function currentTextSize(): TextSize {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    // Storage can be off (private modes); the default size then.
  }
  return (TEXT_SIZES as readonly string[]).includes(saved as string) ? (saved as TextSize) : DEFAULT;
}

export function setTextSize(size: TextSize): void {
  try {
    if (size === DEFAULT) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, size);
    }
  } catch {
    // Not kept, but still applied below.
  }
  if (size === DEFAULT) {
    document.documentElement.removeAttribute('data-text-size');
  } else {
    document.documentElement.setAttribute('data-text-size', size);
  }
}

/** The size one step smaller (-1) or larger (+1), within the sizes there are. */
export function stepTextSize(size: TextSize, step: -1 | 1): TextSize {
  const index = Math.min(TEXT_SIZES.length - 1, Math.max(0, TEXT_SIZES.indexOf(size) + step));
  return TEXT_SIZES[index];
}
