import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { KHITMA_CYCLE_TYPE } from '../../entities/entities';
import { FRIDAY, RepeatEvery, RoundSchedule } from '../../schedule';
import { CommonService } from '../../service/common.service';
import { intlLocale } from '../../languages';

/** Saturday first, Friday (the usual day) last. */
const WEEK = [6, 0, 1, 2, 3, 4, 5];

/**
 * How a khitma repeats by itself. Closes with the new schedule, null to stop repeating, or nothing when cancelled.
 */
@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ScheduleComponent {
  readonly KHITMA_CYCLE_TYPE = KHITMA_CYCLE_TYPE;
  readonly weekdays: { value: number; label: string }[];

  every: RepeatEvery | 'off';
  weekday: number;
  cycleType: number;

  constructor(
    public dialogRef: MatDialogRef<ScheduleComponent, RoundSchedule | null>,
    @Inject(MAT_DIALOG_DATA) current: RoundSchedule | null,
    common: CommonService
  ) {
    this.every = current?.every ?? 'week';
    this.weekday = current?.weekday ?? FRIDAY;
    this.cycleType = current?.cycleType ?? KHITMA_CYCLE_TYPE.AUTO_BOOK;
    const format = new Intl.DateTimeFormat(intlLocale(common.currentLanguage || 'ar'), { weekday: 'long' });
    // 1 March 2026 was a Sunday (0).
    this.weekdays = WEEK.map((value) => ({ value, label: format.format(new Date(2026, 2, 1 + value)) }));
  }

  save() {
    if (this.every === 'off') {
      this.dialogRef.close(null);
      return;
    }
    this.dialogRef.close({
      every: this.every,
      ...(this.every === 'week' ? { weekday: this.weekday } : {}),
      cycleType: this.cycleType,
    });
  }
}
