import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Juz, JUZ_STATUS } from 'src/app/entities/entities';

@Component({
  selector: 'app-juz-toggle',
  templateUrl: './juz-toggle.component.html',
  styleUrls: ['./juz-toggle.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class JuzToggleComponent implements OnInit {

  @Input() juz: Juz;
  @Input() isMyJuz: boolean;

  stateName: string;

  constructor() { }

  ngOnInit(): void {

    switch (this.juz.status) {
      case JUZ_STATUS.IDLE: this.stateName = "idle"; break;
      case JUZ_STATUS.BOOKED: this.stateName = "booked"; break;
      case JUZ_STATUS.DONE: this.stateName = "done"; break;
    }


  }

  getCssClasses() {

    let classes = this.stateName;

    if (this.isMyJuz) {
      classes += " my-juz";
    }

    return classes;
  }

}
