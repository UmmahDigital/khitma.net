import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';

/**
 * A QR code for a link, drawn as an SVG: dark modules on white, with the quiet zone scanners need, in light and
 * dark mode alike (inverted codes don't scan everywhere). The encoder loads with the first code, not with the app.
 */
@Component({
  selector: 'app-qr-code',
  template: `
    @if (path) {
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" role="img" [attr.aria-label]="label" shape-rendering="crispEdges">
        <rect [attr.width]="size" [attr.height]="size" fill="#fff" />
        <path [attr.d]="path" fill="#000" />
      </svg>
    }
  `,
  styles: [':host { display: block; } svg { display: block; width: 100%; height: auto; border-radius: 8px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class QrCodeComponent implements OnChanges {
  @Input() value = '';
  @Input() label = '';

  path = '';
  size = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnChanges(): Promise<void> {
    const value = this.value;
    if (!value) {
      return;
    }
    const { default: qrcode } = await import('qrcode-generator');
    if (value !== this.value) {
      return;
    }
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const margin = 4;
    let path = '';
    for (let row = 0; row < count; row++) {
      // One rectangle per run of dark modules in a row.
      for (let col = 0; col < count; col++) {
        if (!qr.isDark(row, col)) {
          continue;
        }
        let end = col;
        while (end + 1 < count && qr.isDark(row, end + 1)) {
          end++;
        }
        path += `M${col + margin} ${row + margin}h${end - col + 1}v1h-${end - col + 1}z`;
        col = end;
      }
    }
    this.size = count + 2 * margin;
    this.path = path;
    this.cdr.markForCheck();
  }
}
