import { Component, NgZone, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from '../../../analytics';
import {
  JUZ_STATUS,
  KhitmaGroup,
  KHITMA_GROUP_TYPE,
  KhitmaGroup_SameTask,
} from '../../../entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { LocalDatabaseService } from '../../../local-database.service';
import { ReferralService } from '../../../referral.service';

@Component({
    selector: 'app-group-join',
    templateUrl: './group-join.component.html',
    styleUrls: ['./group-join.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class GroupJoinComponent implements OnInit {
  group: KhitmaGroup;
  inviteLink: string;
  username: string;

  constructor(
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private $gaService: GoogleAnalyticsService,
    private referral: ReferralService,
    private router: Router,
    private _ngZone: NgZone
  ) {}

  ngOnInit() {
    this.groupsApi
      .getCurrentGroup()
      .subscribe((value: KhitmaGroup) => (this.group = value));
  }

  /** Links opened inside these apps get their own storage, so the member's place is lost when they open it elsewhere. */
  readonly inAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Snapchat|musical_ly|TikTok|Line\//i.test(navigator.userAgent);

  /**
   * Names already in the group: whoever has a juz (or is a member, in task and page groups). A member whose phone
   * forgot them (a new phone, iOS clearing site data, another browser) picks their name instead of retyping it,
   * which had to match exactly or their juz stayed booked forever.
   */
  get existingNames(): string[] {
    const group: any = this.group;
    if (!group) {
      return [];
    }
    const names = new Set<string>();
    if (group.type === KHITMA_GROUP_TYPE.SAME_TASK || group.type === KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION) {
      Object.keys(group.members || {}).forEach((name) => names.add(name.trim()));
    } else {
      for (const juz of group.ajza || []) {
        if (juz?.owner && juz.status !== JUZ_STATUS.IDLE) {
          names.add(juz.owner.trim());
        }
      }
    }
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
  }

  /** Back in as an existing member: nothing is written, so their juz and done status stay as they are. */
  continueAs(name: string) {
    this.$gaService.send('member_reclaimed', { group_id: this.group.id, group_type: this.group.type || 'SEQUENTIAL' });
    this.localDB.joinGroup(this.group.id, name);
    window.location.reload();
  }

  join() {
    if (!this.group) {
      return;
    }
    this.$gaService.send('group_joined', { group_id: this.group.id, group_type: this.group.type || 'SEQUENTIAL' });

    let username = KhitmaGroup.refineOwnerName(this.username);

    this.localDB.joinGroup(this.group.id, username);
    // Joining through a shared link counts for whoever shared it; the reload waits until that's saved.
    const credited = this.referral.credit('joined', this.group.id);
    if (
      this.group.type === KHITMA_GROUP_TYPE.SAME_TASK ||
      this.group.type === KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION
    ) {
      Promise.all([this.groupsApi.addGroupMember(this.group.id, username), credited]).then(() => {
        window.location.reload();
      });
    } else {
      credited.then(() => window.location.reload());
    }

    // this.router.navigate(['/group', this.group.id, 'dashboard']);

    // this._ngZone.run(() => { this.router.navigate(['/group', this.group.id, 'dashboard']) });
  }
}
