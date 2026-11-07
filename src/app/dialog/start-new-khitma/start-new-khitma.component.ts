import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { KHITMA_CYCLE_TYPE } from 'src/app/entities/entities';
import { nextRoundAfterManualStart, RoundSchedule, whenText } from '../../schedule';
import { fill } from '../../share-messages';
import { CommonService } from '../../service/common.service';

/** What the dialog is told about the khitma: its round number, how it repeats, and when its round started. */
export interface StartNewKhitmaData {
  title?: string;
  author?: string;
  description?: string;
  cycle?: number;
  schedule?: RoundSchedule | null;
  /** The next automatic start, when the khitma repeats on a rhythm. */
  pendingRoundAt?: Date | null;
  /** When the current round started, and whether it started by itself. */
  currentRoundAt?: Date | null;
  currentRoundBy?: 'admin' | 'schedule' | null;
}

/** A round that started this recently is mentioned, so an admin doesn't start a second one on top of it. */
const RECENT_MS = 12 * 3_600_000;

@Component({
    selector: 'app-start-new-khitma',
    templateUrl: './start-new-khitma.component.html',
    styleUrls: ['./start-new-khitma.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class StartNewKhitmaComponent implements OnInit {

  group: StartNewKhitmaData;
  newCycleState: number = KHITMA_CYCLE_TYPE.AUTO_BOOK;

  KHITMA_CYCLE_TYPE = KHITMA_CYCLE_TYPE;

  private readonly now = new Date();

  constructor(public dialogRef: MatDialogRef<StartNewKhitmaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StartNewKhitmaData, private common: CommonService) {

    this.group = data;

  }

  ngOnInit() {

  }

  /** «بدأت هذه الختمة تلقائيًا اليوم الساعة 00:24.», while the round under way is a few hours old. */
  get startedNote(): string | null {
    const at = this.data.currentRoundAt;
    if (!at || this.now.getTime() - at.getTime() > RECENT_MS) {
      return null;
    }
    const t = this.common.translation.newKhitma ?? {};
    const when = whenText(at, this.now, this.common.translation, this.common.currentLanguage);
    return this.data.currentRoundBy === 'schedule'
      ? fill(t.startedAuto || 'بدأت هذه الختمة تلقائيًا {when}.', { when })
      : fill(t.startedAt || 'بدأت هذه الختمة {when}.', { when });
  }

  /** In a khitma that repeats: that starting now stands in for the next automatic start, and when the one after is. */
  get repeatNote(): string | null {
    const schedule = this.data.schedule;
    if (!schedule || schedule.every === 'completion' || this.newCycleState === KHITMA_CYCLE_TYPE.REWIND) {
      return null;
    }
    const pending = this.data.pendingRoundAt ?? null;
    const after = nextRoundAfterManualStart(schedule, pending, this.now);
    if (!after) {
      return null;
    }
    const t = this.common.translation.newKhitma ?? {};
    const when = (at: Date) => whenText(at, this.now, this.common.translation, this.common.currentLanguage);
    return pending && pending > this.now
      ? fill(t.repeatNext || 'تبدأ الختمة التالية تلقائيًا {when}؛ إن بدأتها الآن فستُحسب بدلًا منها، وتبدأ التي بعدها {after}.', {
          when: when(pending),
          after: when(after),
        })
      : fill(t.repeatAfter || 'إن بدأتها الآن، تبدأ الختمة التي بعدها تلقائيًا {after}.', { after: when(after) });
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(this.newCycleState);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }


}
