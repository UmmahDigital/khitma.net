import { expect, test } from '@playwright/test';
import { joinedGroups, openApp } from '../support/app';
import { createSequentialGroup, newGroupId } from '../support/fixtures';

// What search engines, AI assistants and link previews get. Many of them never run JavaScript, so they only read
// the HTML as served.

/** The text of the HTML as served, the way a crawler that doesn't run JavaScript reads it. */
function servedText(html: string): string {
  return html
    .replace(/<head>[\s\S]*?<\/head>/, ' ')
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

test.describe('what crawlers read', () => {
  test('every page describes khitma.net, not the update screen', async ({ request }) => {
    for (const path of ['/', '/group/some-group-id']) {
      const text = servedText(await (await request.get(path)).text());
      expect(text).toContain('ختمة القرآن الكريم جماعيًّا');
      expect(text).toContain('أسئلة شائعة');
      expect(text).toContain('read the whole Quran together');
      expect(text).not.toContain('يحتاج المتصفّح إلى تحديث');
      expect(text).not.toContain('too old');
    }
  });

  test('structured data names the app and answers common questions', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    const graph = JSON.parse(json)['@graph'];
    expect(graph.find((node: any) => node['@type'] === 'WebApplication')).toMatchObject({
      name: 'ختمة.نت',
      url: 'https://khitma.net/',
      isAccessibleForFree: true,
    });
    const faq = graph.find((node: any) => node['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(5);
    for (const question of faq.mainEntity) {
      expect(question.acceptedAnswer.text.length).toBeGreaterThan(10);
    }
  });

  test('link previews get an absolute, small image', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const image = html.match(/<meta property="og:image" content="([^"]+)">/)![1];
    expect(image).toBe('https://khitma.net/assets/og/default.jpg');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');

    const file = await request.get(new URL(image).pathname);
    expect(file.headers()['content-type']).toBe('image/jpeg');
    // WhatsApp skips preview images over about 300 kB.
    expect((await file.body()).length).toBeLessThan(150_000);
  });

  test('robots.txt, the sitemap and llms.txt are real files', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://khitma.net/sitemap.xml');
    expect(robots).not.toContain('angular.io');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.headers()['content-type']).toContain('xml');
    expect(await sitemap.text()).toContain('<loc>https://khitma.net/</loc>');

    const llms = await (await request.get('/llms.txt')).text();
    expect(llms).toMatch(/^# Khitma\.net/);
    expect(llms).toContain('](https://khitma.net/new)');
  });

  test('people can zoom', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const viewport = html.match(/<meta name="viewport" content="([^"]+)">/)![1];
    expect(viewport).not.toMatch(/user-scalable=no|maximum-scale=1\b/);
  });
});

test.describe('the app, once it runs', () => {
  test('replaces the loading screen with the real page', async ({ page }) => {
    await openApp(page, '/');
    await expect(page.getByRole('link', { name: 'إنشاء مجموعة ختمة دوريّة' })).toBeVisible();
    await expect(page.locator('[data-boot]')).toHaveCount(0);
  });

  test('keeps group pages out of search results, and gives public pages their address', async ({ page }) => {
    const groupId = newGroupId('seo-group');
    await createSequentialGroup(groupId, { title: 'ختمة عن روح الوالد', author: 'أبو أحمد' });

    await openApp(page, `/group/${groupId}`, { storage: { groups: joinedGroups({ [groupId]: 'سارة' }) } });
    await expect(page.getByText('السلام عليكم يا سارة')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

    // Leaving the group page in the app: indexable again, with the site's own title back.
    await page.getByRole('link', { name: 'شرح الاستخدام' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://khitma.net/about');
    await expect(page).toHaveTitle('ختمة.نت — ختمة القرآن الكريم جماعيًّا');
  });
});
