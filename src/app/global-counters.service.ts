import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { KhitmaGroupService } from './khitma-group.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalCountersService {
  private _AVG_AJZA_PER_DAY = 1000;

  private _AVG_AYA_PER_SECOND =
    ((this._AVG_AJZA_PER_DAY / 30) * 6236) / 24 / 60 / 60; // 6236 is number of ayat in Quran
  private _AVG_HASANAT_IN_AYA = (320015 / 6236) * 10; // 320015 is number of huruf in Quran

  private _lastDataSnapshot = {
    date: new Date(Date.parse('2022-06-17 00:00:00-0000'.replace(' ', 'T'))), // the replacement is to convert the date to valid ISO 8601:
    ayatCount: 107404498,
  };

  private _ayatCounter$ = new Subject();
  private _hasanatCounter$ = new Subject();

  constructor(private groupsApi: KhitmaGroupService) {
    setInterval(() => {
      const secondsDiff = Math.abs(
        (new Date().getTime() - this._lastDataSnapshot.date.getTime()) / 1000
      );

      let count: number = Math.round(
        this._lastDataSnapshot.ayatCount +
          secondsDiff * this._AVG_AYA_PER_SECOND
      );

      this._ayatCounter$.next(count);
      this._hasanatCounter$.next(Math.round(count * this._AVG_HASANAT_IN_AYA));
    }, 1000);
  }

  getAyatCount() {
    return this._ayatCounter$;
  }

  getHasanatCount() {
    return this._hasanatCounter$;
  }

  aqsaKhitmaCounters() {
    return this.groupsApi.getGlobalKhitma('aqsa').valueChanges();
  }

  aqsaKhitmaPagesDone(pages) {
    this.groupsApi.updateGlobalKhitaCounter(
      'aqsa',
      'pages.completed',
      pages.to - pages.from + 1
    );
  }

  aqsaKhitmaBookPages(numOfPages) {
    numOfPages = parseInt(numOfPages);
    this.groupsApi.updateGlobalKhitaCounter(
      'aqsa',
      'pages.granted',
      numOfPages
    );
    // update doing counter
  }
}
