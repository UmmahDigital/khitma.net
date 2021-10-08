import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CelebrationService {

  private _newCelebration$ = new Subject();

  constructor() { }

  celebrate() {
    this._newCelebration$.next(true);
  }

  newCelebration() {
    return this._newCelebration$;
  }
}
