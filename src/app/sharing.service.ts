import { Injectable } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoogleAnalyticsService } from './analytics';
import { NativeApiService } from './native-api.service';
import { CommonService } from './service/common.service';
import { ReferralService } from './referral.service';

/** What was shared, as the `content_type` of the `share` analytics event. */
export type ShareContent = 'invite' | 'status' | 'free_juz' | 'completion_dua';

/**
 * Every way a khitma gets shared. Most members arrive from a WhatsApp link, so WhatsApp comes first; nothing here
 * fails silently (before, the share button did nothing in browsers without a share sheet).
 */
@Injectable({ providedIn: 'root' })
export class SharingService {
  constructor(
    private nativeApi: NativeApiService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private analytics: GoogleAnalyticsService,
    private common: CommonService,
    private referral: ReferralService
  ) {}

  /** Opens WhatsApp with the message ready to send; inside the store app, its share bridge. */
  whatsapp(message: string, content: ShareContent, groupId?: string): void {
    if (this.nativeApi.hasBridge) {
      this.track('flutter', content, groupId);
      this.nativeApi.share('', message, null);
      return;
    }
    this.track('whatsapp', content, groupId);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  /** The phone's share sheet; where there is none, the message is copied and WhatsApp offered. */
  share(title: string, message: string, content: ShareContent, groupId?: string): void {
    if (this.nativeApi.hasBridge || this.nativeApi.isAvailable) {
      this.track(this.nativeApi.hasBridge ? 'flutter' : 'native', content, groupId);
      // Closing the share sheet rejects the promise; that's not an error.
      Promise.resolve(this.nativeApi.share(title, message, null)).catch(() => {});
      return;
    }
    this.copy(message, content, groupId, true);
  }

  copy(message: string, content: ShareContent, groupId?: string, offerWhatsApp = false): void {
    this.clipboard.copy(message);
    this.track('copy', content, groupId);
    const sharing = this.common.translation.sharing;
    const snackBar = this.snackBar.open(
      sharing?.copied || 'تمّ نسخ الرسالة',
      offerWhatsApp ? sharing?.whatsappShort || 'واتساب' : '',
      { duration: 6000 }
    );
    if (offerWhatsApp) {
      snackBar.onAction().subscribe(() => this.whatsapp(message, content, groupId));
    }
  }

  private track(method: string, content: ShareContent, groupId?: string): void {
    this.referral.noteShared();
    this.analytics.send('share', { method, content_type: content, ...(groupId ? { item_id: groupId } : {}) });
  }
}
