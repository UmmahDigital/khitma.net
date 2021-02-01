import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS, NUM_OF_AJZA, GET_JUZ_READ_EXTERNAL_URL } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../../khitma-group.service';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';


import { Overlay, OverlayContainer, ScrollStrategy } from '@angular/cdk/overlay';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Title } from '@angular/platform-browser';


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

  isAdmin: boolean = false;

  showCelebration: boolean = false;

  isGroupInfoExpanded: false;

  currentViewMode: 'progress';

  isInitiated = false;

  constructor(private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title) {
  }

  ngOnInit(): void {

    this.groupsApi.getCurrentGroup().subscribe((group: KhitmaGroup) => {

      if (!group) {
        return;
      }

      this.titleService.setTitle(group.title);

      this.group = new KhitmaGroup(group);

      this.group.ajza = group.ajza;

      if (!this.isInitiated) {

        // My current juz
        this.myJuzIndex = this.localDB.getMyJuz(this.group.id);

        this.username = this.localDB.getUsername(this.group.id);
        this.isAdmin = this.group.isAdmin(this.username);

        const myLastJuz = this.localDB.getMyLastJuz(this.group.id);

        // Check if this a recurring group
        if (myLastJuz != null && this.group.cycle > 0) {

          let myNextJuzFromCycle = this.group.ajza.find(juz => juz.owner === this.username);

          if (myNextJuzFromCycle) {
            this.localDB.setMyJuz(this.group.id, this.group.cycle, myNextJuzFromCycle.index);
            this.myJuzIndex = myNextJuzFromCycle.index;
            return;
          }

          // Check if a new cycle was started while I was away
          const myCycle = this.localDB.getMyKhitmaCycle(this.group.id);

          if (myCycle < this.group.cycle) {

            const myNextJuz = (myLastJuz + this.group.cycle - myCycle) % NUM_OF_AJZA;

            this.proposeNextJuz(myLastJuz, myNextJuz);

          }






        }

        if (this.myJuzIndex && group.ajza[this.myJuzIndex].status == JUZ_STATUS.DONE) {
          this.myJuzIndex = null;
        }

        this.isInitiated = true;
      }

    });

  }

  proposeNextJuz(lastJuz, nextJuz) {

    const dialogData = new ConfirmDialogModel(
      "تلاوة جزءك التالي",
      "في المرّة الأخيرة قرأت جزء " + (lastJuz + 1) + ". هل تريد قراءة جزء " + (nextJuz + 1) + " هذه المرّة؟");

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.groupsApi.updateJuz(this.group.id, nextJuz, this.username, JUZ_STATUS.BOOKED);
        this.localDB.setMyJuz(this.group.id, this.group.cycle, nextJuz);
        this.myJuzIndex = nextJuz;

        this.$gaService.event('next_juz_accepted');

      }

    });

  }

  juzSelected(juz: Juz) {

    const isUpdateForOtherUserCaseAdminCase = (juz.owner != this.username);
    const isUpdateMyDoneJuzAdminCase = (juz.owner == this.username && juz.status == JUZ_STATUS.DONE);

    if (this.isAdmin && (isUpdateForOtherUserCaseAdminCase || isUpdateMyDoneJuzAdminCase)) {

      if (juz.status == JUZ_STATUS.BOOKED) {
        this.groupsApi.updateJuz(this.group.id, juz.index, juz.owner, JUZ_STATUS.DONE);

        this.$gaService.event('admin_juz_update');

        return;
      }

      if (juz.status == JUZ_STATUS.DONE) {
        this.groupsApi.updateJuz(this.group.id, juz.index, "", JUZ_STATUS.IDLE);

        this.$gaService.event('admin_juz_update');

        return;
      }

      // if (juz.status == JUZ_STATUS.IDLE) {
      //   this.groupsApi.updateJuz(this.group.id, juz.index, "عام", JUZ_STATUS.BOOKED);
      //   return;
      // }


    }

    if (juz.status != JUZ_STATUS.IDLE) {
      return;
    }

    if (juz.status != JUZ_STATUS.IDLE || this.myJuzIndex != null) {
      return;
    }

    this.$gaService.event('juz_selected');

    this.myJuzIndex = juz.index;

    this.localDB.setMyJuz(this.group.id, this.group.cycle, juz.index);
    this.groupsApi.updateJuz(this.group.id, juz.index, this.username, JUZ_STATUS.BOOKED);
  }

  juzDone() {


    const title = "تأكيد إتمام الجزء";
    const msg = "هل أتممت قراءة جزء " + (this.myJuzIndex + 1) + "؟";

    const dialogData = new ConfirmDialogModel(title, msg);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('juz_done');

        this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.DONE);
        this.localDB.setMyJuz(this.group.id, this.group.cycle, null);
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
    this.localDB.setMyJuz(this.group.id, this.group.cycle, null);
    this.myJuzIndex = null;
  }

  startNewKhitmah() {

    const dialogData = new ConfirmDialogModel(
      "تأكيد بدء ختمة جديدة",
      "بدء ختمة جديدة سيقوم بإعادة كل الأجزاء إلى وضعيّة الإتاحة وتمكين كل عضو في المجموعة من اختيار جزئه الجديد.");

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('group_new_khitmah');


        this.group.cycle++;
        this.groupsApi.startNewKhitmah(this.group.id, this.group.cycle);

        const myLastJuz = this.localDB.getMyLastJuz(this.group.id);

        this.proposeNextJuz(myLastJuz, myLastJuz + 1);
      }

    });

  }

  getMyJuzReadUrl() {
    return GET_JUZ_READ_EXTERNAL_URL(this.myJuzIndex);
  }

  getKhitmaStatusMsg() {

    function getJuzIcon(juz) {

      const ICONS = ['🔴', '🟡', '🟢'];

      return ICONS[juz.status];
    }

    const NEW_LINE = "\n";
    const now = new Date();

    let msg = this.group.title;

    msg += NEW_LINE;
    msg += "وضع الختمة " + now.getHours() + ":" + now.getMinutes();
    msg += NEW_LINE;
    msg += NEW_LINE;

    this.group.ajza.forEach(juz => {

      msg += ("0" + (juz.index + 1)).slice(-2) + " " + getJuzIcon(juz) + " " + (juz.owner || "");

      // if (juz.status === JUZ_STATUS.DONE) {
      //   msg += " 👏";
      // }

      msg += NEW_LINE;

    });

    // return window.encodeURIComponent(msg);

    msg += NEW_LINE;
    msg += NEW_LINE;

    msg += "رجاء حتلنة جزئكم عن طريق الرابط: " + this.group.getURL();

    msg += NEW_LINE;
    msg += NEW_LINE;

    msg += "بارك الله بكم!";
    return msg;
  }

}
