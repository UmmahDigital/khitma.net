import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

import { Juz, JUZ_STATUS } from '../../entities/entities';

@Component({
  selector: 'app-juz-list',
  templateUrl: './juz-list.component.html',
  styleUrls: ['./juz-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class JuzListComponent implements OnInit {

  @Input() ajza: Juz[];
  @Input() myJuzIndex?: number;
  @Input() allowEdit?: boolean;

  @Output() onEdited?= new EventEmitter<Juz>();
  @Output() onJuzSelection?= new EventEmitter<Juz>();


  constructor() { }

  ngOnInit(): void {
  }

  juzClicked(juz: Juz) {
    this.onJuzSelection.emit(juz);
  }

  juzEdited(juz: Juz) {
    this.onEdited.emit(juz);
  }

}
