import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { KHITMA_CYCLE_TYPE } from '../../entities/entities';
import { describeSchedule, firstRoundAt, FRIDAY, RepeatEvery, RoundSchedule, whenText } from '../../schedule';
import { fill } from '../../share-messages';
import { CommonService } from '../../service/common.service';
import { intlLocale } from '../../languages';

/** Saturday first, Friday (the usual day) last. */
const WEEK = [6, 0, 1, 2, 3, 4, 5];

/** The khitma's repeat as it is, and its round under way: the first automatic start mustn't cut that short. */
export interface ScheduleDialogData {
  current: RoundSchedule | null;
  roundStartedAt: Date | null;
  complete: boolean;
}

/**
 * How a khitma repeats by itself. Closes with the new schedule, null to stop repeating, or nothing when cancelled.
 * Nothing is chosen for a khitma that doesn't repeat yet: two admins who only opened the dialog and saved found their
 * daily khitma moving on every Friday.
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

  every: RepeatEvery | 'off' | null;
  weekday: number;
  cycleType: number;

  private readonly now = new Date();

  constructor(
    public dialogRef: MatDialogRef<ScheduleComponent, RoundSchedule | null>,
    @Inject(MAT_DIALOG_DATA) private data: ScheduleDialogData,
    private common: CommonService
  ) {
    const current = data?.current ?? null;
    this.every = current?.every ?? null;
    this.weekday = current?.weekday ?? FRIDAY;
    this.cycleType = current?.cycleType ?? KHITMA_CYCLE_TYPE.AUTO_BOOK;
    const format = new Intl.DateTimeFormat(intlLocale(common.currentLanguage || 'ar'), { weekday: 'long' });
    // 1 March 2026 was a Sunday (0).
    this.weekdays = WEEK.map((value) => ({ value, label: format.format(new Date(2026, 2, 1 + value)) }));
  }

  /** The schedule as chosen so far; null while nothing, or «بدون تكرار», is chosen. */
  get chosen(): RoundSchedule | null {
    if (!this.every || this.every === 'off') {
      return null;
    }
    return {
      every: this.every,
      ...(this.every === 'week' ? { weekday: this.weekday } : {}),
      cycleType: this.cycleType,
    };
  }

  /** What will happen, in one sentence. */
  get description(): string | null {
    const schedule = this.chosen;
    return schedule ? describeSchedule(schedule, this.common.translation, this.common.currentLanguage) : null;
  }

  /** «أوّل ختمة تلقائية: الليلة عند منتصف الليل». */
  get firstStart(): string | null {
    const schedule = this.chosen;
    if (!schedule) {
      return null;
    }
    const t = this.common.translation.schedule ?? {};
    if (schedule.every === 'completion') {
      return t.firstAfterCompletion || 'أوّل ختمة تلقائية: بعد ستّ ساعات من اكتمال هذه الختمة';
    }
    const at = firstRoundAt(schedule, this.now, { startedAt: this.data?.roundStartedAt, complete: this.data?.complete });
    return at ? fill(t.first || 'أوّل ختمة تلقائية: {when}', { when: whenText(at, this.now, this.common.translation, this.common.currentLanguage) }) : null;
  }

  /** Choosing «بدون تكرار» for a khitma that repeats: from now on, rounds start only by hand. */
  get offNote(): boolean {
    return this.every === 'off' && !!this.data?.current;
  }

  save() {
    if (!this.every) {
      return;
    }
    this.dialogRef.close(this.chosen);
  }
}
