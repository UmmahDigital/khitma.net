import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss']
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
