import { ErrorHandler } from '@angular/core';
import { GoogleAnalyticsService } from './analytics';
import { errorMessage, errorWhere, MAX_ERRORS_PER_PAGE, offscreenBy, ReportingErrorHandler } from './field-reports';

describe('field reports', () => {
  it('sends error messages without people’s words, short enough for analytics', () => {
    expect(errorMessage(new TypeError("Cannot read properties of undefined (reading 'owner')"))).toBe(
      "Cannot read properties of undefined (reading 'owner')"
    );
    expect(errorMessage(new Error('Group «ختمة عن روح محمد» not found'))).toBe('Group … not found');
    expect(errorMessage('x'.repeat(300)).length).toBe(100);
    expect(errorMessage({ name: 'ChunkLoadError' })).toBe('ChunkLoadError');
    expect(errorMessage(null)).toBe('null');
  });

  it('finds where an error was thrown, in Chromium’s and Safari’s stacks', () => {
    expect(errorWhere({ stack: 'TypeError: x\n    at a (https://khitma.net/main-UXZYB6JD.js:1:23456)\n    at b (https://khitma.net/chunk-AB.js:2:3)' })).toBe(
      'main-UXZYB6JD.js:1:23456'
    );
    expect(errorWhere({ stack: 'a@https://khitma.net/chunk-ZW3KCWBE.js:3:456\nb@https://khitma.net/main.js:1:2' })).toBe('chunk-ZW3KCWBE.js:3:456');
    expect(errorWhere('just a string')).toBe('');
  });

  it('reports each error once, and at most a few per page', () => {
    const analytics = jasmine.createSpyObj<GoogleAnalyticsService>('GoogleAnalyticsService', ['send']);
    const handler = new ReportingErrorHandler(analytics);
    spyOn(ErrorHandler.prototype, 'handleError');

    handler.handleError(new Error('first'));
    handler.handleError(new Error('first'));
    expect(analytics.send).toHaveBeenCalledOnceWith('app_error', { error_message: 'first', error_where: jasmine.any(String), error_source: 'angular' });
    expect(ErrorHandler.prototype.handleError).toHaveBeenCalledTimes(2);

    for (let i = 0; i < 10; i++) {
      handler.report(new Error(`other ${i}`), 'promise');
    }
    expect(analytics.send).toHaveBeenCalledTimes(MAX_ERRORS_PER_PAGE);
  });

  describe('dialog buttons off the screen', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = '<div class="mat-mdc-dialog-actions"><button class="mat-mdc-button-base"></button><button class="mat-mdc-button-base"></button></div>';
      document.body.appendChild(container);
    });

    afterEach(() => container.remove());

    function place(index: number, top: number, left: number) {
      const button = container.querySelectorAll<HTMLElement>('button')[index];
      Object.assign(button.style, { position: 'fixed', top: `${top}px`, left: `${left}px`, width: '80px', height: '40px', margin: '0', padding: '0', border: '0' });
    }

    it('is 0 when every button fits', () => {
      place(0, 500, 20);
      place(1, 500, 120);
      expect(offscreenBy(container, 360, 595)).toBe(0);
    });

    it('measures how far the furthest button reaches past the bottom or the side', () => {
      place(0, 580, 20); // 25px below a 595px screen
      place(1, 500, 300); // 20px past a 360px screen
      expect(offscreenBy(container, 360, 595)).toBe(25);
    });
  });
});
