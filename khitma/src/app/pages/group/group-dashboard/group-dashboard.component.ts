import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../../khitma-group.service';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';


import { Overlay, OverlayContainer, ScrollStrategy } from '@angular/cdk/overlay';
import { GoogleAnalyticsService } from 'ngx-google-analytics';


@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GroupDashboardComponent implements OnInit {

  group: KhitmaGroup;
  myJuzIndex: number;
  username: string;

  showCelebration: boolean = false;

  constructor(private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService) {
  }

  ngOnInit(): void {

    this.groupsApi.getCurrentGroup().subscribe((group: KhitmaGroup) => {

      if (!group) {
        return;
      }

      this.group = group;


      this.myJuzIndex = this.localDB.getMyJuz(this.group.id);

      if (this.myJuzIndex && group.ajza[this.myJuzIndex].status == JUZ_STATUS.DONE) {
        this.myJuzIndex = null;
      }

      this.username = this.localDB.getUsername(this.group.id);

    });

  }

  juzSelected(juz: Juz) {

    if (juz.status != JUZ_STATUS.IDLE || this.myJuzIndex != null) {
      return;
    }

    this.$gaService.event('juz_selected');


    this.myJuzIndex = juz.index;

    this.localDB.setMyJuz(this.group.id, juz.index);
    this.groupsApi.updateJuz(this.group.id, juz.index, this.username, JUZ_STATUS.BOOKED);
  }

  juzDone() {

    this.$gaService.event('juz_done');


    const title = "تأكيد إتمام الجزء";
    const msg = "هل أتممت قراءة جزء " + (this.myJuzIndex + 1) + "؟";

    const dialogData = new ConfirmDialogModel(title, msg);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        // add confirmation modal
        this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.DONE);
        this.localDB.setMyJuz(this.group.id, null);
        this.myJuzIndex = null;

        this.showCelebration = true;

        setTimeout(() => {
          this.showCelebration = false;
        }, 2250);


      }
    });
  }

  juzGiveup() {

    this.$gaService.event('juz_giveup');

    // add confirmation modal
    this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.IDLE);
    this.localDB.setMyJuz(this.group.id, null);
    this.myJuzIndex = null;
  }
}
