import {
  APP_INITIALIZER,
  Directive,
  HostListener,
  Injectable,
  InjectionToken,
  Input,
  ModuleWithProviders,
  NgModule,
  DOCUMENT
} from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';


// Google Analytics (gtag.js) calls, without a third-party wrapper.
//
// Group pages put the group's name in the tab title, and those names include names of the deceased (and sometimes
// contact details). GA would copy the tab title into every hit, so each screen gets a generic name instead
// (`data.screen` on its route), sent as the page title of its page view and of every event after it.

const MEASUREMENT_ID = new InjectionToken<string>('GA measurement ID');

type Gtag = (...args: unknown[]) => void;
type Params = Record<string, unknown>;

function gtag(): Gtag {
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag =
    w.gtag ||
    function () {
      w.dataLayer.push(arguments);
    };
  return w.gtag;
}

/** Sent with every event while a group page is open, so reports can be cut by group. */
export interface GroupContext {
  group_id: string;
  group_type: string;
  role: 'admin' | 'member';
  cycle: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  private groupContext: GroupContext | null = null;

  setGroupContext(context: GroupContext | null): void {
    this.groupContext = context;
  }

  event(action: string, category?: string, label?: string, value?: number, interaction?: boolean): void {
    const params: Params = {};
    if (category) {
      params.event_category = category;
    }
    if (label) {
      params.event_label = label;
    }
    if (value) {
      params.value = value;
    }
    if (interaction !== undefined) {
      params.interaction = interaction;
    }
    this.send(action, params);
  }

  /** Sends an event with the open group's context; parameters given here take precedence. */
  send(action: string, params: Params = {}): void {
    const all = this.groupContext ? { ...this.groupContext, ...params } : params;
    try {
      if (Object.keys(all).length > 0) {
        gtag()('event', action, all);
      } else {
        gtag()('event', action);
      }
    } catch {
      // Analytics must never break the app.
    }
  }

  /** A page view named by its screen. The name also becomes the page title of every later event. */
  pageView(screen: string, url: string): void {
    try {
      gtag()('set', { page_title: screen });
      gtag()('event', 'page_view', { page_title: screen, page_location: url });
    } catch {
      // Analytics must never break the app.
    }
  }
}

/** Sends `gaEvent` (with the optional `gaCategory`) when the element is clicked. */
@Directive({
    selector: '[gaEvent]',
    standalone: false
})
export class GaEventDirective {
  @Input() gaEvent: string;
  @Input() gaCategory?: string;

  constructor(private analytics: GoogleAnalyticsService) {}

  @HostListener('click')
  onClick(): void {
    this.analytics.event(this.gaEvent, this.gaCategory);
  }
}

/** The deepest `data.screen` on the active route, e.g. `group_dashboard`. */
export function screenName(route: ActivatedRouteSnapshot | null): string {
  let screen = 'other';
  for (let r = route; r; r = r.firstChild) {
    if (r.data?.['screen']) {
      screen = r.data['screen'];
    }
  }
  return screen;
}

function whenPageLoaded(document: Document, run: () => void): void {
  const later = () => setTimeout(run, 0);
  if (document.readyState === 'complete') {
    later();
  } else {
    document.defaultView?.addEventListener('load', later, { once: true });
  }
}

/** Real visitors' Core Web Vitals, as `web_vitals` events (CLS is multiplied by 1000 to keep values whole). */
function reportWebVitals(analytics: GoogleAnalyticsService): void {
  import('web-vitals')
    .then(({ onCLS, onINP, onLCP }) => {
      const report = (metric: { name: string; value: number; delta: number; rating: string; id: string }) => {
        const scale = metric.name === 'CLS' ? 1000 : 1;
        analytics.send('web_vitals', {
          metric_name: metric.name,
          metric_value: Math.round(metric.value * scale),
          metric_rating: metric.rating,
          metric_id: metric.id,
          value: Math.round(metric.delta * scale),
        });
      };
      onCLS(report);
      onINP(report);
      onLCP(report);
    })
    .catch(() => {
      // Old browsers without these APIs simply don't report.
    });
}

function initAnalytics(measurementId: string, document: Document, router: Router, analytics: GoogleAnalyticsService) {
  return () => {
    if (!measurementId) {
      return;
    }
    const send = gtag();
    send('js', new Date());
    // The automatic page view would carry the tab title; page views are sent per screen below instead.
    send('config', measurementId, { send_page_view: false });

    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      analytics.pageView(screenName(router.routerState.snapshot.root), document.location.origin + event.urlAfterRedirects);
    });

    // gtag.js waits until the page has loaded, so it never competes with the app's own files for the network.
    whenPageLoaded(document, () => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      reportWebVitals(analytics);
    });
  };
}

@NgModule({
  declarations: [GaEventDirective],
  exports: [GaEventDirective],
})
export class AnalyticsModule {
  static forRoot(measurementId: string): ModuleWithProviders<AnalyticsModule> {
    return {
      ngModule: AnalyticsModule,
      providers: [
        { provide: MEASUREMENT_ID, useValue: measurementId },
        {
          provide: APP_INITIALIZER,
          useFactory: initAnalytics,
          deps: [MEASUREMENT_ID, DOCUMENT, Router, GoogleAnalyticsService],
          multi: true,
        },
      ],
    };
  }
}
