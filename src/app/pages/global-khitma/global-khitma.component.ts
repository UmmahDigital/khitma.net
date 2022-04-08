import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroupService } from '../../khitma-group.service';

import * as firebase from 'firebase/compat/app';
// import undefined from 'firebase/compat/firestore';
import { LocalDatabaseService } from '../../local-database.service';
import { map } from 'rxjs/operators';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
} from '../../shared/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../service/common.service';

@Component({
  selector: 'app-global-khitma',
  templateUrl: './global-khitma.component.html',
  styleUrls: ['./global-khitma.component.scss'],
  // encapsulation: ViewEncapsulation.None
})
export class GlobalKhitmaComponent implements OnInit {
  constructor(
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private $gaService: GoogleAnalyticsService,
    private dialog: MatDialog,
    public common: CommonService
  ) {}

  dayInRamadan = 0;

  ajza = [];

  myAjzaStatuses;

  isInit = false;

  totalAjzaCounter;

  ngOnInit(): void {
    function daysBetween(StartDate, EndDate) {
      // The number of milliseconds in all UTC days (no DST)
      const oneDay = 1000 * 60 * 60 * 24;

      // A day in UTC always lasts 24 hours (unlike in other time formats)
      const start = Date.UTC(
        EndDate.getFullYear(),
        EndDate.getMonth(),
        EndDate.getDate()
      );
      const end = Date.UTC(
        StartDate.getFullYear(),
        StartDate.getMonth(),
        StartDate.getDate()
      );

      // so it's safe to divide by 24 hours
      return (start - end) / oneDay;
    }

    this.groupsApi
      .getGlobalKhitma('ramadan2021')
      .get()
      .subscribe((res: any) => {
        let data = res.data();

        let ramadanStartDate = new Date(data.startDate);

        let dayInRamadan = daysBetween(ramadanStartDate, new Date()) + 1;

        // dayInRamadan = 10;
        this.dayInRamadan = dayInRamadan; //> 0 ? dayInRamadan : 0;

        this.myAjzaStatuses = this.localDB.getMyGlobalKhitmaAjza();
        this.ajza = this.getAjzaArray(data.ajza);

        this.totalAjzaCounter = data.totalAjzaCounter;
      });
  }

  getAjzaArray(ajzaObj) {
    let arr = [];

    for (const [key, value] of Object.entries(ajzaObj)) {
      arr.push({
        index: parseInt(key),
        counter: value,
      });
    }

    return arr;
  }

  submitJuz(juzIndex, isDone) {
    this.myAjzaStatuses[juzIndex] = isDone;
    this.groupsApi.globalKhitmaUpdateJuz('ramadan2021', juzIndex, isDone);

    this.totalAjzaCounter += isDone ? 1 : -1;
    this.localDB.updateGlobalKhitmaJuz(juzIndex, isDone);

    this.$gaService.event(
      isDone ? 'juz_done' : 'juz_undone',
      'global_khitma',
      'ramadan2021'
    );
  }

  resetKhitma() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(
        this.common.translation.gKhitma?.new,
        this.common.translation.gKhitma?.bless
      ),
      maxWidth: '80%',
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (dialogResult) {
        this.localDB.resetMyGlobalKhitmaAjza();
        this.myAjzaStatuses = this.localDB.getMyGlobalKhitmaAjza();
      }
    });
  }
}
