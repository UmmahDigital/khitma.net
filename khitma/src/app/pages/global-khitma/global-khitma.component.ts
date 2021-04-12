import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroupService } from 'src/app/khitma-group.service';

import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { map } from 'rxjs/operators';
import { GoogleAnalyticsService } from 'ngx-google-analytics';

@Component({
  selector: 'app-global-khitma',
  templateUrl: './global-khitma.component.html',
  styleUrls: ['./global-khitma.component.scss'],
  // encapsulation: ViewEncapsulation.None

})
export class GlobalKhitmaComponent implements OnInit {

  constructor(private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService, private $gaService: GoogleAnalyticsService,) { }

  dayInRamadan = 0;

  ajza = [];

  myAjzaStatuses;

  isInit = false;

  totalAjzaCounter;

  ngOnInit(): void {


    this.groupsApi.getGlobalKhitma("ramadan2021").get().subscribe((res: any) => {

      let data = res.data();

      let ramadanStartDate = new Date(data.startDate);

      let dayInRamadan = this.DaysBetween(ramadanStartDate, new Date()) + 1;

      // dayInRamadan = 10;
      this.dayInRamadan = dayInRamadan;//> 0 ? dayInRamadan : 0;

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
        counter: value
      });

    }

    return arr;

  }



  DaysBetween(StartDate, EndDate) {
    // The number of milliseconds in all UTC days (no DST)
    const oneDay = 1000 * 60 * 60 * 24;

    // A day in UTC always lasts 24 hours (unlike in other time formats)
    const start = Date.UTC(EndDate.getFullYear(), EndDate.getMonth(), EndDate.getDate());
    const end = Date.UTC(StartDate.getFullYear(), StartDate.getMonth(), StartDate.getDate());

    // so it's safe to divide by 24 hours
    return (start - end) / oneDay;
  }


  submitJuz(juzIndex, isDone) {

    this.myAjzaStatuses[juzIndex] = isDone;
    this.groupsApi.globalKhitmaUpdateJuz("ramadan2021", juzIndex, isDone);

    this.totalAjzaCounter += (isDone ? 1 : -1);
    this.localDB.updateGlobalKhitmaJuz(juzIndex, isDone);


    this.$gaService.event(isDone ? 'juz_done' : 'juz_undone', 'global_khitma', 'ramadan2021');


  }

}
