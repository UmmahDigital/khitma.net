import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalCountersService {

  private _AVG_AJZA_PER_DAY = 1000;

  private _AVG_AYA_PER_SECOND = this._AVG_AJZA_PER_DAY / 30 * 6236 / 24 / 60 / 60; // 6236 is number of ayat in Quran
  private _AVG_HASANAT_IN_AYA = (320015 / 6236) * 10; // 320015 is number of huruf in Quran

  private _lastDataSnapshot = {
    date: new Date("2021-9-28"),
    ayatCount: 44575551
  };



  private _ayatCounter$ = new Subject();
  private _hasanatCounter$ = new Subject();


  constructor() {

    setInterval(() => {

      const secondsDiff = Math.abs((new Date().getTime() - this._lastDataSnapshot.date.getTime()) / 1000);

      let count: number = Math.round(this._lastDataSnapshot.ayatCount + (secondsDiff * this._AVG_AYA_PER_SECOND));

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
}
