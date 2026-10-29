import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShell, siteOrigin } from './shell.js';

const PROD = 'https://khitma.net';

test('answers for the production site, Firebase domains and preview channels, and nothing else', () => {
  assert.equal(siteOrigin('khitma.net', PROD), 'https://khitma.net');
  assert.equal(siteOrigin('www.khitma.net', PROD), 'https://www.khitma.net');
  assert.equal(siteOrigin('quran-khitma.web.app', PROD), 'https://quran-khitma.web.app');
  assert.equal(siteOrigin('quran-khitma--pr33-link-previews-abc123.web.app', PROD), 'https://quran-khitma--pr33-link-previews-abc123.web.app');
  assert.equal(siteOrigin('KHITMA.NET, proxy.example', PROD), 'https://khitma.net');
  for (const host of ['evil.example', 'khitma.net.evil.example', 'quran-khitma--x.web.app.evil.example', '', undefined]) {
    assert.equal(siteOrigin(host, PROD), PROD);
  }
});

/** A fake site: each call answers with the next response, and records the request. */
function fakeSite(responses) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, method: init.method || 'GET' });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      headers: new Map(Object.entries(next.etag ? { etag: next.etag } : {})),
      text: async () => next.body,
    };
  };
  return { fetchImpl, requests };
}

test('index.html is checked on every request, so a deploy never leaves an old copy behind', async () => {
  const site = fakeSite([
    { status: 200, body: '<html>release 1</html>', etag: '"r1"' },
    { status: 200, etag: '"r1"' },
    { status: 200, etag: '"r2"' },
    { status: 200, body: '<html>release 2</html>', etag: '"r2"' },
  ]);
  const shell = createShell(site.fetchImpl);
  assert.deepEqual(await shell(PROD), { html: '<html>release 1</html>', stale: false });
  assert.deepEqual(await shell(PROD), { html: '<html>release 1</html>', stale: false });
  assert.deepEqual(await shell(PROD), { html: '<html>release 2</html>', stale: false });
  // The page is downloaded only when its ETag changes; the checks in between are HEAD requests.
  assert.deepEqual(site.requests.map((r) => r.method), ['GET', 'HEAD', 'HEAD', 'GET']);
  assert.equal(site.requests[0].url, 'https://khitma.net/index.html');
});

test('when the site cannot be reached, the last copy is used (marked stale), and without one it fails', async () => {
  const site = fakeSite([
    { status: 200, body: '<html>ok</html>', etag: '"a"' },
    new Error('network'),
    { status: 503 },
    { status: 500 },
  ]);
  const shell = createShell(site.fetchImpl);
  await shell(PROD);
  assert.deepEqual(await shell(PROD), { html: '<html>ok</html>', stale: true });
  assert.deepEqual(await shell(PROD), { html: '<html>ok</html>', stale: true });

  const empty = createShell(fakeSite([new Error('network')]).fetchImpl);
  await assert.rejects(() => empty(PROD), /network/);
});

test('each site keeps its own copy (a preview channel serves its own release)', async () => {
  const site = fakeSite([
    { status: 200, body: '<html>production</html>', etag: '"p"' },
    { status: 200, body: '<html>preview</html>', etag: '"q"' },
  ]);
  const shell = createShell(site.fetchImpl);
  const preview = 'https://quran-khitma--pr33-x.web.app';
  assert.equal((await shell(PROD)).html, '<html>production</html>');
  assert.equal((await shell(preview)).html, '<html>preview</html>');
  assert.deepEqual(site.requests[1], { url: `${preview}/index.html`, method: 'GET' });
});
