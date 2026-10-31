import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConfirmDialogComponent implements OnInit {
  title: string;
  message: string;
  confirm?: string;
  dismiss?: string;

  constructor(public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
    this.confirm = data.confirm;
    this.dismiss = data.dismiss;
  }

  ngOnInit() {
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }
}

/**
 * Class to represent confirm dialog model.
 *
 * It has been kept here to keep it as part of shared component.
 * The title asks the question; the message, if any, says what follows. `confirm` and `dismiss` name the buttons
 * after what they do ("أرشفة", "إلغاء"), which reads better and is harder to tap by mistake than نعم and لا.
 */
export class ConfirmDialogModel {

  constructor(public title: string, public message: string, public confirm?: string, public dismiss?: string) {
  }
}
