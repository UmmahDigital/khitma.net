// Anonymous invitation references. Every link a member shares carries their phone's code (?r=k7f2xq9a): a random
// code, tied to no name. When someone joins, reads or starts a khitma through it, refs/{code} counts it, so the
// sharer sees what their invitations brought about. Counts only: no names, and never a "hasanat" number.

export const REF_PARAM = 'r';
export const REF_CODE_KEY = 'refCode';
export const REFERRALS_KEY = 'referrals';
/** Set once this phone has shared a link: only then is there an impact worth looking up. */
export const REF_SHARED_KEY = 'refShared';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newRefCode(random: Uint8Array = crypto.getRandomValues(new Uint8Array(8))): string {
  return Array.from(random, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export function isRefCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{6,16}$/.test(value);
}

export function withRef(url: string, code: string | null | undefined): string {
  if (!code) {
    return url;
  }
  const [base, hash] = url.split('#');
  return `${base}${base.includes('?') ? '&' : '?'}${REF_PARAM}=${code}${hash === undefined ? '' : '#' + hash}`;
}

/** The reference in a landing address, and the group it leads to (/group/{id}?r=…). */
export function landingRef(pathname: string, search: string): { code: string; groupId: string | null } | null {
  const code = new URLSearchParams(search).get(REF_PARAM);
  if (!isRefCode(code)) {
    return null;
  }
  return { code, groupId: pathname.match(/^\/group\/([^/?#]+)/)?.[1] ?? null };
}

export function withoutRef(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(REF_PARAM);
  const rest = params.toString();
  return rest ? '?' + rest : '';
}

/** What this phone knows about the invitation that brought it here. */
export interface Referrals {
  /** The last shared link opened here. */
  landing?: { code: string; groupId: string | null; at: number };
  /** Groups joined through a link, with the code that brought them: reading there is credited to it. */
  groups?: Record<string, string>;
  /** Whether a khitma started here was already credited. */
  started?: boolean;
}

/** True when this page load came from a shared link; its first page view is then marked as such in analytics. */
export let landedFromSharedLink = false;

/**
 * Runs before the app starts: keeps the reference from the address (unless it's this phone's own), and removes it
 * from the address so it isn't passed on or kept in bookmarks.
 */
export function captureLandingRef(win: Window = window): void {
  try {
    const ref = landingRef(win.location.pathname, win.location.search);
    if (!ref) {
      return;
    }
    win.history.replaceState(win.history.state, '', win.location.pathname + withoutRef(win.location.search) + win.location.hash);
    if (ref.code === win.localStorage.getItem(REF_CODE_KEY)) {
      return;
    }
    const referrals: Referrals = JSON.parse(win.localStorage.getItem(REFERRALS_KEY) || '{}');
    referrals.landing = { ...ref, at: Date.now() };
    win.localStorage.setItem(REFERRALS_KEY, JSON.stringify(referrals));
    landedFromSharedLink = true;
  } catch {
    // A reference is a nicety; the link must open regardless.
  }
}

export interface RefStats {
  joined?: number;
  read?: number;
  started?: number;
}

/** Arabic counted nouns: 1 and 2 are words, 3-10 take the plural, 11-99 the singular accusative, 100, 101… the singular. */
function arabicCount(count: number, forms: { one: string; two: string; plural: string; single: string; accusative: string }) {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  const rest = count % 100;
  if (rest >= 3 && rest <= 10) return `${count} ${forms.plural}`;
  if (rest >= 11) return `${count} ${forms.accusative}`;
  return `${count} ${forms.single}`;
}

/**
 * "انضمّ عبر دعواتك 7 أشخاص، وقرؤوا 12 جزءًا." and "وبدأ واحد منهم ختمة جديدة."; in other languages, one line
 * per number. Empty until someone has joined.
 */
export function impactLines(stats: RefStats | null, translation: any, lang: string): string[] {
  const joined = stats?.joined ?? 0;
  const read = stats?.read ?? 0;
  const started = stats?.started ?? 0;
  if (joined < 1) {
    return [];
  }
  if (lang !== 'ar') {
    const t = translation?.referral ?? {};
    const lines = [(t.joined || 'Joined through your invitations: {n}').replace('{n}', String(joined))];
    if (read > 0) lines.push((t.read || 'Juz they read: {n}').replace('{n}', String(read)));
    if (started > 0) lines.push((t.started || 'New khitmas they started: {n}').replace('{n}', String(started)));
    return lines;
  }
  const people = arabicCount(joined, { one: 'شخص واحد', two: 'شخصان', plural: 'أشخاص', single: 'شخص', accusative: 'شخصًا' });
  let sentence = `انضمّ عبر دعواتك ${people}`;
  if (read > 0) {
    const verb = joined === 1 ? 'وقرأ' : joined === 2 ? 'وقرآ' : 'وقرؤوا';
    const ajza = arabicCount(read, { one: 'جزءًا واحدًا', two: 'جزأين', plural: 'أجزاء', single: 'جزء', accusative: 'جزءًا' });
    sentence += `، ${verb} ${ajza}`;
  }
  const lines = [sentence + '.'];
  if (started > 0) {
    const who = started === 1 ? 'واحد' : started === 2 ? 'اثنان' : String(started);
    lines.push(`وبدأ ${who} منهم ختمة جديدة.`);
  }
  return lines;
}
