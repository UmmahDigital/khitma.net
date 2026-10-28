import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';

import { Juz, JUZ_STATUS } from '../../entities/entities';

@Component({
    selector: 'app-juz-grid',
    templateUrl: './juz-grid.component.html',
    styleUrls: ['./juz-grid.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class JuzGridComponent implements OnInit {

  @Input() ajza: Juz[];
  @Input() myAjzaIndexes: number[] = [];
  @Output() onJuzSelection = new EventEmitter<Juz>();

  constructor() { }

  ngOnInit(): void {
  }

  juzClicked(juz: Juz) {

    // if (juz.status != JUZ_STATUS.IDLE) {
    //   return;
    // }

    this.onJuzSelection.emit(juz);
  }

}
