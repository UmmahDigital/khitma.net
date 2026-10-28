import {
  APP_INITIALIZER,
  Directive,
  HostListener,
  Inject,
  Injectable,
  InjectionToken,
  Input,
  ModuleWithProviders,
  NgModule,
  DOCUMENT
} from '@angular/core';


// Google Analytics (gtag.js) calls, matching what ngx-google-analytics sent, without a third-party wrapper.

const MEASUREMENT_ID = new InjectionToken<string>('GA measurement ID');

type Gtag = (...args: unknown[]) => void;

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

@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  event(action: string, category?: string, label?: string, value?: number, interaction?: boolean): void {
    const params: Record<string, unknown> = {};
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

    try {
      if (Object.keys(params).length > 0) {
        gtag()('event', action, params);
      } else {
        gtag()('event', action);
      }
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

function loadGtag(measurementId: string, document: Document) {
  return () => {
    if (!measurementId) {
      return;
    }
    const send = gtag();
    send('js', new Date());
    send('config', measurementId);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
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
        { provide: APP_INITIALIZER, useFactory: loadGtag, deps: [MEASUREMENT_ID, DOCUMENT], multi: true },
      ],
    };
  }
}
