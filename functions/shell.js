// The app's index.html, as served by Firebase Hosting on the site the visitor used, for functions answering paths
// that Hosting rewrites to them.
//
// index.html names the hashed bundles of the current release, and Hosting serves only the current release's files.
// So the copy kept here is checked on every request: a copy from before a deploy would name bundles that no longer
// exist, and the page would stay blank.

/** Sites this function answers for: production, Firebase's own domains, and preview channels. */
const SITES = /^(khitma\.net|www\.khitma\.net|quran-khitma\.(web\.app|firebaseapp\.com)|quran-khitma--[a-z0-9-]+\.web\.app)$/;

/** The site a request came through (Hosting passes its host on), or the production site for anything else. */
export function siteOrigin(forwardedHost, fallback) {
  const host = String(forwardedHost || '').split(',')[0].trim().toLowerCase();
  return SITES.test(host) ? `https://${host}` : fallback;
}

/**
 * index.html from an origin, checked against the last copy with a HEAD request (Hosting answers conditional GETs with
 * the whole page, but its ETag is a hash of the content). Resolves to `{ html, stale }`: `stale` is true when the site
 * could not be reached and the last good copy is used instead. Rejects when there is no copy at all.
 */
export function createShell(fetchImpl = fetch) {
  const copies = new Map();
  return async function shell(origin) {
    const url = `${origin}/index.html`;
    const copy = copies.get(origin);
    try {
      if (copy?.etag) {
        const head = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        if (head.ok && head.headers.get('etag') === copy.etag) {
          return { html: copy.html, stale: false };
        }
      }
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) {
        throw new Error(`index.html: ${response.status}`);
      }
      const html = await response.text();
      copies.set(origin, { html, etag: response.headers.get('etag') });
      return { html, stale: false };
    } catch (error) {
      if (copy) {
        console.warn(`index.html from ${origin} unavailable, using the last copy:`, error.message);
        return { html: copy.html, stale: true };
      }
      throw error;
    }
  };
}

/** What a visitor gets when not even a stale index.html is at hand: the same address again in two seconds. */
export const RETRY_PAGE =
  '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta http-equiv="refresh" content="2">' +
  '<meta name="robots" content="noindex"><title>ختمة.نت</title></head><body></body></html>';
