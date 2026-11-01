import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GoogleAnalyticsService } from '../../../analytics';
import { JUZ_STATUS, KhitmaGroup_Sequential } from '../../../entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { SharedModule } from '../../../modules/shared.module';
import { memorialDua } from '../../../purpose';
import { ReferralService } from '../../../referral.service';
import { CommonService } from '../../../service/common.service';
import { QrCodeComponent } from '../../../shared/qr-code/qr-code.component';

const HIDE_NAMES_KEY = 'screenHideNames';

/**
 * The khitma on a big screen (a TV or a laptop where the family gathers, e.g. in a house of condolence): every juz
 * with its reader, updated as people book and finish, and a QR code that people scan to join and pick a juz.
 */
@Component({
  selector: 'app-group-screen',
  templateUrl: './group-screen.component.html',
  styleUrls: ['./group-screen.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [SharedModule, QrCodeComponent],
})
export class GroupScreenComponent implements OnInit, OnDestroy {
  group: KhitmaGroup_Sequential | null = null;
  missing = false;
  link = '';
  /** Names on a shared screen are the organiser's choice; kept on this device. */
  hideNames = localStorage.getItem(HIDE_NAMES_KEY) === '1';
  readonly canFullscreen = !!document.fullscreenEnabled;
  readonly JUZ_STATUS = JUZ_STATUS;

  private subscription?: Subscription;
  private wakeLock: { release(): Promise<void> } | null = null;

  constructor(
    private route: ActivatedRoute,
    private groupsApi: KhitmaGroupService,
    private referral: ReferralService,
    private titleService: Title,
    private $gaService: GoogleAnalyticsService,
    public common: CommonService
  ) {}

  ngOnInit(): void {
    const groupId = this.route.snapshot.paramMap.get('groupId');
    this.link = this.referral.groupUrl(groupId);
    this.subscription = this.groupsApi.watchGroup(groupId).subscribe((group) => {
      this.group = group;
      this.missing = !group;
      if (group) {
        this.titleService.setTitle(group.title);
      }
    });
    this.keepAwake();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.$gaService.send('big_screen_opened', { group_id: groupId });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.wakeLock?.release().catch(() => undefined);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  get counts(): { done: number; reading: number; free: number } {
    const ajza = this.group?.ajza ?? [];
    return {
      done: ajza.filter((juz) => juz.status === JUZ_STATUS.DONE).length,
      reading: ajza.filter((juz) => juz.status === JUZ_STATUS.BOOKED).length,
      free: ajza.filter((juz) => juz.status === JUZ_STATUS.IDLE).length,
    };
  }

  /** The link without "https://" and the sharer's code, short enough to type from across the room. */
  get shortLink(): string {
    return this.link.replace(/^https?:\/\//, '').replace(/[?#].*$/, '');
  }

  get memorialDuaText(): string | null {
    return this.group?.purpose === 'memorial' ? memorialDua(this.group.honoreeGender) : null;
  }

  toggleNames(hide: boolean): void {
    this.hideNames = hide;
    localStorage.setItem(HIDE_NAMES_KEY, hide ? '1' : '0');
    this.$gaService.send('big_screen_names', { hidden: hide });
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  /** A screen left on in a room shouldn't go to sleep (where the browser allows it to stay awake). */
  private async keepAwake(): Promise<void> {
    try {
      this.wakeLock = (await (navigator as any).wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.keepAwake();
    }
  };
}
