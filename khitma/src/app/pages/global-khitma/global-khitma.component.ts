import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroupService } from 'src/app/khitma-group.service';

import * as firebase from 'firebase/app';
import 'firebase/firestore';

@Component({
  selector: 'app-global-khitma',
  templateUrl: './global-khitma.component.html',
  styleUrls: ['./global-khitma.component.scss'],
  // encapsulation: ViewEncapsulation.None

})
export class GlobalKhitmaComponent implements OnInit {

  constructor(private groupsApi: KhitmaGroupService) { }

  dayInRamadan = 0;

  ajza = [];


  ngOnInit(): void {



    this.groupsApi.getGlobalKhitma("ramadan2021").subscribe((data: any) => {



      let ramadanStartDate = new Date(data.startDate);

      let dayInRamadan = this.DaysBetween(ramadanStartDate, new Date()) + 1;

      this.dayInRamadan = dayInRamadan;//> 0 ? dayInRamadan : 0;



      this.ajza = this.getAjzaArray(data.ajza);

    });


  }

  getAjzaArray(ajzaObj) {

    let arr = [];

    for (const [key, value] of Object.entries(ajzaObj)) {
      arr.push({
        index: key,
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

    this.groupsApi.globalKhitmaJuzDone("ramadan2021", juzIndex);

  }

}
