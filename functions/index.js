import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { previewText, withPreview } from './preview.js';
import { createShell, RETRY_PAGE, siteOrigin } from './shell.js';

// See preview.js. Firebase Hosting rewrites /group/{id} here (firebase.json); every other path is untouched.

initializeApp();
const db = getFirestore();
const shell = createShell();

/** The address shared links use, for og:url (local testing sets another). */
const SITE = process.env.SITE_ORIGIN || 'https://khitma.net';

// Hosting's CDN keeps each answer for 5 minutes (a link posted in a WhatsApp group is opened in bursts) and purges it
// on every deploy. Browsers always revalidate: the page names the release's bundles.
const CACHED = 'public, max-age=0, s-maxage=300';

/** The {id} of /group/{id}, if it can be a Firestore document id. */
function groupId(path) {
  try {
    const id = decodeURIComponent(String(path).split('/')[2] || '');
    return /^[\w-]{1,128}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const groupPreview = onRequest(
  // One warm instance (about $8 a month) spares the people who open a shared link a cold start of a second or more;
  // set minInstances to 0 to drop it. The function is mostly waiting on Firestore, so one instance serves many at once.
  {
    region: 'us-central1',
    // Hosting calls it without credentials, like any visitor.
    invoker: 'public',
    memory: '256MiB',
    concurrency: 80,
    minInstances: 1,
    maxInstances: 10,
    timeoutSeconds: 10,
  },
  async (req, res) => {
    const origin = siteOrigin(req.get('x-forwarded-host'), SITE);
    const id = groupId(req.path);
    // Both at once: the page itself, and the khitma for its preview tags.
    const [page, group] = await Promise.allSettled([shell(origin), id ? db.collection('groups').doc(id).get() : null]);
    if (page.status === 'rejected') {
      console.error(page.reason);
      res.status(503).set('Cache-Control', 'no-store').set('Retry-After', '2').type('html').send(RETRY_PAGE);
      return;
    }
    let html = page.value.html;
    let cache = 'public, max-age=0, s-maxage=60';
    if (group.status === 'rejected') {
      // The app itself still works without the preview tags.
      console.error(group.reason);
    } else if (group.value?.exists) {
      try {
        html = withPreview(html, { ...previewText(group.value.data()), url: `${SITE}/group/${id}` });
        cache = CACHED;
      } catch (error) {
        console.error(error);
      }
    }
    res
      .set('Cache-Control', page.value.stale ? 'no-store' : cache)
      .set('X-Robots-Tag', 'noindex')
      .status(200)
      .type('html')
      .send(html);
  }
);
