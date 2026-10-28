import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-new-task',
    templateUrl: './new-task.component.html',
    styleUrls: ['./new-task.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class NewTaskComponent implements OnInit {

  newTask

  constructor(public dialogRef: MatDialogRef<string>,
    @Inject(MAT_DIALOG_DATA) public data: string) {

  }

  ngOnInit() {
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(this.newTask);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }


}
