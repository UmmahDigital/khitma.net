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
  @Input() isMyJuz: boolean;
  @Input() isEditMode?: boolean;

  @Output() onJuzSelection?= new EventEmitter<Juz>();
  @Output() onEdited?= new EventEmitter<Juz>();

  stateName: string;
  msg: string;
  cssClasses: string;

  updatedOwner: string;

  constructor() {
  }

  ngOnInit(): void {

    this.updatedOwner = this.juz.owner;

    switch (this.juz.status) {
      case JUZ_STATUS.IDLE: this.stateName = "idle"; break;
      case JUZ_STATUS.BOOKED: this.stateName = "booked"; break;
      case JUZ_STATUS.DONE: this.stateName = "done"; break;
    }

    let _cssClasses = this.stateName;

    if (this.isEditMode) {
      _cssClasses += " edit-mode";
    }

    this.msg = "لم تتم قراءته بعد..";

    if (this.isMyJuz) {
      _cssClasses += " my-juz";
    }

    if (this.juz.status == JUZ_STATUS.IDLE) {
      _cssClasses += " mat-elevation-z2"; // add elevation --> clickable
      this.msg = "إضغط لاختيار هذا الجزء";
    }

    this.cssClasses = _cssClasses;
  }

  juzClicked() {
    this.onJuzSelection.emit(this.juz);
  }

  updateOwner(newOwner: string) {

    let updatedStatus = this.juz.status;

    if (this.juz.status == JUZ_STATUS.IDLE && newOwner != "") {
      this.juz.status = JUZ_STATUS.BOOKED;
    }

    this.juz.owner = newOwner;

    this.onEdited.emit(this.juz);

  }


}
