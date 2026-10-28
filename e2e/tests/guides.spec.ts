import { expect, test } from '@playwright/test';
import { openApp } from '../support/app';

// Plain pages that answer common questions: whole in their HTML for search engines and AI assistants, linked from
// the site, and leading to a khitma.

const GUIDES = [
  { slug: 'khitma-for-the-deceased', h1: 'ختمة عن روح الميت: كيف تنظّمها مع العائلة والأصدقاء', cta: '/new?type=onetime&purpose=memorial&from=guide_memorial' },
  { slug: 'ramadan-group-khitma', h1: 'ختمة رمضان الجماعية: طريقتان لتنظيمها', cta: '/new?type=onetime&purpose=ramadan&from=guide_ramadan' },
  { slug: 'whatsapp-group-khitma', h1: 'كيف تنظّم ختمة قرآن جماعية عبر واتساب', cta: '/new?type=onetime&from=guide_whatsapp' },
];

test.describe('guides', () => {
  for (const guide of GUIDES) {
    test(`${guide.slug} is a complete page without JavaScript`, async ({ request }) => {
      const response = await request.get(`/guide/${guide.slug}/`);
      expect(response.status()).toBe(200);
      const page = await response.text();
      expect(page).toContain(`<h1>${guide.h1}</h1>`);
      expect(page).toContain(`<link rel="canonical" href="https://khitma.net/guide/${guide.slug}/">`);
      expect(page).toContain(`href="${guide.cta.replace(/&/g, '&amp;')}"`);
      const data = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
      const faq = data['@graph'].find((node: any) => node['@type'] === 'FAQPage');
      expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
      // Every question in the structured data is on the page too.
      for (const question of faq.mainEntity) {
        expect(page).toContain(`<summary>${question.name}</summary>`);
      }
    });
  }

  test('the guides are in the sitemap and in llms.txt', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const llms = await (await request.get('/llms.txt')).text();
    for (const { slug } of GUIDES) {
      expect(sitemap).toContain(`<loc>https://khitma.net/guide/${slug}/</loc>`);
      expect(llms).toContain(`https://khitma.net/guide/${slug}/`);
    }
  });

  test('the memorial guide leads to a memorial khitma, ready to name', async ({ page }) => {
    await page.route(/googletagmanager\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/, (route) => route.abort());
    await page.goto('/guide/khitma-for-the-deceased/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GUIDES[0].h1);
    await page.getByRole('link', { name: 'ابدأ ختمة عن روح من تحب' }).click();

    await expect(page).toHaveURL(/\/new\?type=onetime&purpose=memorial&from=guide_memorial$/);
    await expect(page.getByRole('button', { name: 'عن روح متوفّى' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('اسم المتوفّى')).toBeVisible();
  });

  test('the about page links to the guides', async ({ page }) => {
    await openApp(page, '/about');
    const guides = page.getByRole('navigation', { name: 'أدلة مفيدة' });
    for (const { slug, h1 } of GUIDES) {
      await expect(guides.getByRole('link', { name: h1 })).toHaveAttribute('href', `/guide/${slug}/`);
    }
  });
});
