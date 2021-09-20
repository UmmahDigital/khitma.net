import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { GloablNotification } from './entities/notification';
import { LocalDatabaseService } from './local-database.service';
import { NotificationComponent } from './shared/notification/notification.component';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {


  constructor(private db: AngularFirestore, private localDB: LocalDatabaseService, private dialog: MatDialog) {
    // orderBy('id', 'desc')

    this.db.collection("notifications", ref => ref.limit(1)).valueChanges({ idField: 'id' }).subscribe((_notifications) => {

      if (!_notifications.length) {
        return;
      }

      let notification: GloablNotification = new GloablNotification(_notifications[0]);

      const lastId = localDB.getLastRecievedNotificationId();

      if (notification.isActive && lastId != notification.id) {
        this.notify(notification);
      }

    });
  }

  notify(notification: GloablNotification) {

    const dialogRef = this.dialog.open(NotificationComponent, {
      data: notification,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dontDisplayAgain => {

      if (dontDisplayAgain) {
        this.localDB.setLastRecievedNotificationId(notification.id);

      }
    });

  }
}
