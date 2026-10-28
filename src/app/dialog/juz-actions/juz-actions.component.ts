import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonService } from '../../service/common.service';
import { fill } from '../../share-messages';

export interface JuzActionsData {
  juzNumber: number;
  owner: string;
  /** "محجوز منذ 9 أيام", when the booking time is known. */
  ageText: string | null;
}

export type JuzAction = 'done' | 'release';

/** What an admin can do with a booked juz: mark it read, or free it for another reader. */
@Component({
  selector: 'app-juz-actions',
  templateUrl: './juz-actions.component.html',
  styleUrls: ['./juz-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class JuzActionsComponent {
  readonly title: string;

  constructor(
    public dialogRef: MatDialogRef<JuzActionsComponent, JuzAction>,
    @Inject(MAT_DIALOG_DATA) public data: JuzActionsData,
    common: CommonService
  ) {
    this.title = fill(common.translation.juzActions?.title || 'الجزء {n}', { n: data.juzNumber });
  }

  choose(action?: JuzAction) {
    this.dialogRef.close(action);
  }
}
