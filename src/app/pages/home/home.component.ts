import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from '../../analytics';
// import {
//   KhitmaGroup,
//   KhitmaGroup_Sequential,
//   KHITMA_GROUP_TYPE,
// } from '../../entities/entities';
// import { GlobalCountersService } from '../../global-counters.service';
// import { LocalDatabaseService } from '../../local-database.service';
// import {
//   ConfirmDialogComponent,
//   ConfirmDialogModel,
// } from '../../shared/confirm-dialog/confirm-dialog.component';

import {
  KhitmaGroup,
  KhitmaGroup_Sequential,
  KHITMA_GROUP_TYPE,
} from '@app/entities/entities';

import { GlobalCountersService } from '@app/global-counters.service';
import { LocalDatabaseService } from '@app/local-database.service';
import { UserService } from '@app/service/user.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
} from '@app/shared/confirm-dialog/confirm-dialog.component';
import { KhitmaGroupService } from '../../khitma-group.service';
import { ReferralService } from '../../referral.service';
import { impactLines } from '../../referral';
import { fill, hadithLine } from '../../share-messages';
import { isRamadanSeason } from '../../ramadan';
import { CommonService } from '../../service/common.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent implements OnInit {
  groups: KhitmaGroup[];

  isShowArchive: boolean;

  year = new Date().getFullYear();

  ayatCount = 0;
  hasanatCount = 0;

  /** From the middle of Sha'ban to the end of Ramadan, the home page offers the two Ramadan khitmas first. */
  readonly ramadanSeason = isRamadanSeason(new Date());

  /** What this member's shared links brought about: people who joined, ajza they read, khitmas they started. */
  impact: string[] = [];
  impactHadith = '';

  // Dayma has Arabic and English pages; every other language gets the English one.
  readonly daymaUrl: string;

  constructor(
    private router: Router,
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private globalCounters: GlobalCountersService,
    private svcUser: UserService,
    private referral: ReferralService,
    public common: CommonService
  ) {
    this.daymaUrl = common.currentLanguage === 'ar' ? 'https://dayma.hasanat.dev/?lang=ar' : 'https://dayma.hasanat.dev/en/';
  }

  ngOnInit(): void {
    this.loadData();
    this.referral.myImpact().then((stats) => {
      this.impact = impactLines(stats, this.common.translation, this.common.currentLanguage);
      this.impactHadith = hadithLine(this.common.translation);
    });
  }

  loadData() {
    let ids = this.localDB.getMyGroups();
    ids = ids.slice(Math.max(ids.length - 10, 0)); // firebase IN array limit of 10
    const user = this.svcUser.currentUser;
    if (user) {
      (user.groupIds ?? []).forEach((id) => {
        if (!ids.includes(id)) {
          ids.push(id);
        }
      });
    }
    if (ids.length > 0) {
      this.groupsApi.getGroups(ids).subscribe((groups) => {
        if (!groups) {
          return;
        }

        this.groups = <KhitmaGroup[]>groups;

        this.groups.forEach((group) => {
          if (!group.type || group.type == KHITMA_GROUP_TYPE.SEQUENTIAL) {
            let seqKhitma = <KhitmaGroup_Sequential>group;

            const _isV2Api = !Array.isArray(seqKhitma.ajza);

            if (_isV2Api) {
              seqKhitma.ajza = KhitmaGroup_Sequential.convertAjzaToArray(
                seqKhitma.ajza
              );
            }
          }
        });
      });
    }

    this.isShowArchive = this.localDB.hasArchive();

    this.globalCounters.getAyatCount().subscribe((count: number) => {
      this.ayatCount = count;
    });
    this.globalCounters.getHasanatCount().subscribe((count: number) => {
      this.hasanatCount = count;
    });
  }

  groupCreated(result) {}

  archiveGroup(group: KhitmaGroup) {
    const dialogData = new ConfirmDialogModel(
      this.common.translation.home?.archiveConfirm,
      fill(this.common.translation.home?.archiveGroup || 'أرشفة مجموعة «{title}»؟', { title: group.title })
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: '80vw',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.$gaService.event('group_leave');

        this.localDB.archiveGroup(group);
        this.groups = this.groups.filter((item) => item.id !== group.id);
        this.isShowArchive = true;
      }
    });
  }

  onLogin($event) {
    if ($event === 'loggedIn') {
      this.loadData();
      // this.router.navigateByUrl("/me/groups")
    }
  }
}
