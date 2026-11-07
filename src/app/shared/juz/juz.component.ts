import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
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
export class JuzComponent implements OnInit, OnChanges {

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
    this.refresh();
  }

  /**
   * The juz changes whenever anyone in the khitma changes theirs. A name the admin is typing here stays: the row used
   * to be redrawn, and what she had typed was lost.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['juz']?.firstChange) {
      return;
    }
    const previous: Juz | undefined = changes['juz']?.previousValue;
    const typing = this.updatedOwner !== (previous ?? this.juz).owner;
    this.refresh(typing);
  }

  private refresh(keepTyping = false): void {

    if (!keepTyping) {
      this.updatedOwner = this.juz.owner;
    }

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
    this.ageText = this.isEditMode && days !== null ? bookingAgeText(days, this.common.translation, this.common.currentLanguage) : null;
  }

  juzClicked() {
    this.onJuzSelection.emit(this.juz);
  }

  /** Sends the juz with its new name; the juz shown stays as it is until the khitma has the change. */
  updateOwner(newOwner: string) {

    const status = this.juz.status == JUZ_STATUS.IDLE && newOwner != "" ? JUZ_STATUS.BOOKED : this.juz.status;

    this.onEdited.emit(new Juz({ ...this.juz, owner: newOwner, status }));

  }


}
