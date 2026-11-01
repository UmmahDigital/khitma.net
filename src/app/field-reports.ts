import { ErrorHandler, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { GoogleAnalyticsService } from './analytics';

// What goes wrong on people's phones, sent to analytics like any event (so without names or titles):
// - `app_error`: an error the app didn't handle;
// - `dialog_offscreen`: a dialog whose buttons don't fit on the screen, so they can't be tapped.
// Both kinds only reached us when someone complained; the app runs on browsers as old as Chromium 79 and iOS 14.5.

/** Errors reported per page load, at most; the same error is reported once. */
export const MAX_ERRORS_PER_PAGE = 5;

/**
 * An error's message, safe to send and short enough for analytics (100 characters). Browsers word their messages in
 * English, so anything else in one (an Arabic name or title, for instance) came from people, and is left out.
 */
export function errorMessage(error: unknown): string {
  const e = error as { message?: unknown; name?: unknown } | null;
  const raw = typeof error === 'string' ? error : String(e?.message || e?.name || error);
  return raw
    .replace(/[^\x20-\x7E]+(?:\s+[^\x20-\x7E]+)*/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/** Where an error was thrown: the file and position of the first frame in its stack, e.g. `main-UXZYB6JD.js:1:23456`. */
export function errorWhere(error: unknown): string {
  const stack = (error as { stack?: unknown } | null)?.stack;
  const frame = typeof stack === 'string' ? stack.match(/([\w.-]+\.m?js):(\d+):(\d+)/) : null;
  return frame ? `${frame[1]}:${frame[2]}:${frame[3]}` : '';
}

/** Angular's error handler (it still logs to the console), which also reports what it catches. */
@Injectable()
export class ReportingErrorHandler extends ErrorHandler {
  private readonly reported = new Set<string>();

  constructor(private analytics: GoogleAnalyticsService) {
    super();
  }

  override handleError(error: unknown): void {
    super.handleError(error);
    this.report(error, 'angular');
  }

  /** Errors outside Angular: in old browsers' polyfills, scripts, or promises nobody waited for. */
  listenToWindow(window: Window): void {
    window.addEventListener('error', (event) => {
      // Errors from other sites' scripts arrive as "Script error." with nothing to go on.
      if (event.error || (event.message && event.message !== 'Script error.')) {
        this.report(event.error ?? event.message, 'window');
      }
    });
    window.addEventListener('unhandledrejection', (event) => this.report(event.reason, 'promise'));
  }

  report(error: unknown, source: 'angular' | 'window' | 'promise'): void {
    const message = errorMessage(error);
    const where = errorWhere(error);
    const key = `${message}|${where}`;
    if (!message || this.reported.has(key) || this.reported.size >= MAX_ERRORS_PER_PAGE) {
      return;
    }
    this.reported.add(key);
    this.analytics.send('app_error', { error_message: message, error_where: where, error_source: source });
  }
}

/**
 * How far a dialog's buttons reach outside the screen, in pixels (0 if they all fit). Measured on the screen
 * without the keyboard: the dialogs open before anyone types.
 */
export function offscreenBy(container: Element, width: number, height: number): number {
  let overflow = 0;
  container.querySelectorAll('.mat-mdc-dialog-actions .mat-mdc-button-base').forEach((button) => {
    const r = button.getBoundingClientRect();
    if (r.width && r.height) {
      overflow = Math.max(overflow, r.bottom - height, -r.top, r.right - width, -r.left);
    }
  });
  return Math.round(overflow);
}

/** Checks every dialog once it has finished opening, wherever in the app it was opened from. */
export function watchDialogs(dialog: MatDialog, analytics: GoogleAnalyticsService, window: Window): void {
  dialog.afterOpened.subscribe((ref: MatDialogRef<unknown>) => {
    ref
      .afterOpened()
      .pipe(take(1))
      .subscribe(() => {
        const container = window.document.getElementById(ref.id);
        const overflow = container ? offscreenBy(container, window.innerWidth, window.innerHeight) : 0;
        if (overflow > 1) {
          analytics.send('dialog_offscreen', {
            // The dialog's component, e.g. app-start-new-khitma: its title could hold a name.
            dialog: container!.querySelector('.mat-mdc-dialog-component-host')?.tagName.toLowerCase() ?? 'unknown',
            overflow_px: overflow,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            root_font_px: Math.round(parseFloat(window.getComputedStyle(window.document.documentElement).fontSize)),
          });
        }
      });
  });
}
