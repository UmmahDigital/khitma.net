import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GloablNotification, NotificationAction } from 'src/app/entities/notification';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { CommonService } from 'src/app/service/common.service';

@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class NotificationComponent {

  public notification: GloablNotification;

  constructor(public dialogRef: MatDialogRef<NotificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GloablNotification,
    private router: Router,
    private localDB: LocalDatabaseService,
    public common: CommonService) {

    this.notification = data;
  }

  /** Any action counts as reading the notification; links within the app open without reloading it. */
  openAction(event: MouseEvent, action: NotificationAction): void {
    this.localDB.setLastRecievedNotificationId(this.notification.id);
    const inApp = /^\/(?!\/)/.test(action.url ?? '');
    if (!inApp || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.dialogRef.close();
    this.router.navigateByUrl(action.url);
  }

}
