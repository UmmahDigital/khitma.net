import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GloablNotification } from 'src/app/entities/notification';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {

  public notification: GloablNotification;
  // public dontDisplayAgain: boolean;

  constructor(public dialogRef: MatDialogRef<NotificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GloablNotification) {

    this.notification = data;

    // this.dialogRef.beforeClosed().subscribe(() => dialogRef.close(this.dontDisplayAgain));

  }

  ngOnInit() {
  }

}



