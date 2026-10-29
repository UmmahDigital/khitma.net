import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { Juz, JUZ_STATUS } from '../../entities/entities';
import { CommonService } from '../../service/common.service';
import { bookedForDays, bookingAgeText } from '../../booking-age';

@Component({
    selector: 'app-juz',
    templateUrl: './juz.component.html',
    styleUrls: ['./juz.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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
  /** For admins: how long this juz has been booked ("محجوز منذ 9 أيام"), when that's known. */
  ageText: string = null;

  constructor(public common: CommonService) {
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

    this.msg = this.common.translation.juz?.notRead;

    if (this.isMyJuz) {
      _cssClasses += " my-juz";
    }

    if (this.juz.status == JUZ_STATUS.IDLE) {
      _cssClasses += " selectable";
      this.msg = this.common.translation.juz?.select;
    }

    this.cssClasses = _cssClasses;

    const days = this.juz.status == JUZ_STATUS.BOOKED ? bookedForDays(this.juz) : null;
    if (this.isEditMode && days !== null) {
      this.ageText = bookingAgeText(days, this.common.translation, this.common.currentLanguage);
    }
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
