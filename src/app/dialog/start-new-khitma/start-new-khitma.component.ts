import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { KhitmaGroup, KHITMA_CYCLE_TYPE } from 'src/app/entities/entities';

@Component({
  selector: 'app-start-new-khitma',
  templateUrl: './start-new-khitma.component.html',
  styleUrls: ['./start-new-khitma.component.scss']
})
export class StartNewKhitmaComponent implements OnInit {

  group: KhitmaGroup;
  newCycleState = KHITMA_CYCLE_TYPE.AUTO_BOOK;

  KHITMA_CYCLE_TYPE = KHITMA_CYCLE_TYPE;

  constructor(public dialogRef: MatDialogRef<StartNewKhitmaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KhitmaGroup) {

    this.group = data;

  }

  ngOnInit() {

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
