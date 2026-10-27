import { Component, OnInit, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { KhitmaGroup } from 'src/app/entities/entities';

@Component({
  selector: 'app-edit-khitma-details',
  templateUrl: './edit-khitma-details.component.html',
  styleUrls: ['./edit-khitma-details.component.scss']
})
export class EditKhitmaDetailsComponent implements OnInit {

  group: KhitmaGroup;

  constructor(public dialogRef: MatDialogRef<EditKhitmaDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KhitmaGroup) {

    this.group = data;
  }

  ngOnInit() {
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(this.group);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }

}
