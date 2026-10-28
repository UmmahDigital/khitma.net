import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { previewText, withPreview } from './preview.js';

// See preview.js. Firebase Hosting rewrites /group/{id} here (firebase.json); every other path is untouched.

initializeApp();
const db = getFirestore();

/** Where the app's index.html is served from (the Hosting emulator when testing locally). */
const SITE = process.env.SITE_ORIGIN || 'https://khitma.net';

// index.html changes with every deploy (it names the hashed bundles), so it's kept for one minute only.
let shell = { html: '', at: 0 };
async function appShell() {
  if (shell.html && Date.now() - shell.at < 60_000) {
    return shell.html;
  }
  const response = await fetch(`${SITE}/index.html`, { headers: { 'cache-control': 'no-cache' } });
  if (!response.ok) {
    throw new Error(`index.html: ${response.status}`);
  }
  shell = { html: await response.text(), at: Date.now() };
  return shell.html;
}

export const groupPreview = onRequest(
  // One warm instance avoids a cold start (about a second) on the first click after the cache expires; it costs a
  // few dollars a month. Raise minInstances to 1 once previews prove their worth.
  { region: 'us-central1', memory: '256MiB', concurrency: 80, minInstances: 0, maxInstances: 10 },
  async (req, res) => {
    let html;
    try {
      html = await appShell();
    } catch (error) {
      console.error(error);
      res.status(503).set('Retry-After', '5').send('');
      return;
    }
    const id = decodeURIComponent(req.path.split('/')[2] || '');
    let cache = 'public, max-age=60, s-maxage=60';
    try {
      const snapshot = /^[\w-]{1,128}$/.test(id) ? await db.collection('groups').doc(id).get() : null;
      if (snapshot?.exists) {
        html = withPreview(html, { ...previewText(snapshot.data()), url: `${SITE}/group/${id}` });
        // A link posted in a WhatsApp group is opened in bursts: the CDN answers most of them for 5 minutes.
        cache = 'public, max-age=60, s-maxage=300';
      }
    } catch (error) {
      console.error(error);
    }
    res.set('Cache-Control', cache).status(200).type('html').send(html);
  }
);
