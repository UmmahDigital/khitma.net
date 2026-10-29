import { Inject, Injectable, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const DEFAULT_TITLE = 'ختمة.نت — ختمة القرآن الكريم جماعيًّا';

/**
 * Per-screen hints for search engines (Google runs the app, so it sees these):
 * group and personal pages carry people's names, including names of the deceased, so they stay out of search
 * results; public pages declare their address.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(@Inject(DOCUMENT) private document: Document, private meta: Meta, private title: Title) {}

  update(url: string): void {
    const path = url.split(/[?#]/)[0] || '/';
    const isPrivate = /^\/(group|me)(\/|$)/.test(path) || /\/invite$/.test(path);

    if (isPrivate) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      this.setCanonical(null);
    } else {
      this.meta.removeTag('name="robots"');
      this.setCanonical(`https://khitma.net${path}`);
      // Group pages show the group's name in the tab; leaving them brings the site's name back.
      this.title.setTitle(DEFAULT_TITLE);
    }
  }

  private setCanonical(href: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}
