import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Juz, JUZ_STATUS } from 'src/app/entities/entities';

@Component({
  selector: 'app-juz',
  templateUrl: './juz.component.html',
  styleUrls: ['./juz.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class JuzComponent implements OnInit {

  @Input() juz: Juz;
  @Input() myJuzIndex: number;

  stateName: string;
  msg: string;
  cssClasses: string;

  constructor() { }

  ngOnInit(): void {

    switch (this.juz.status) {
      case JUZ_STATUS.IDLE: this.stateName = "idle"; break;
      case JUZ_STATUS.BOOKED: this.stateName = "booked"; break;
      case JUZ_STATUS.DONE: this.stateName = "done"; break;
    }

    let _cssClasses = this.stateName;

    this.msg = "لم تتم قراءته بعد..";

    if (this.juz.index == this.myJuzIndex) {
      _cssClasses += " my-juz";

    }

    if (this.myJuzIndex == null && this.juz.status == JUZ_STATUS.IDLE) {
      _cssClasses += " mat-elevation-z2"; // add elevation --> clickable
      this.msg = "إضغط لاختيار هذا الجزء";
    }



    this.cssClasses = _cssClasses;
  }


}
