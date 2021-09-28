import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GloablNotification } from './entities/notification';
import { LocalDatabaseService } from './local-database.service';
import { NotificationComponent } from './shared/notification/notification.component';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private _newNotification$ = new Subject();
  private _mostRecentNotification: GloablNotification = null;

  constructor(private db: AngularFirestore, private localDB: LocalDatabaseService, private dialog: MatDialog) {

    this.db.collection("notifications", ref => ref.orderBy('id', 'desc').limit(1)).valueChanges({ idField: 'id' }).pipe(map(_notifications => {

      if (!_notifications.length) {
        return;
      }

      let notification: GloablNotification = new GloablNotification(_notifications[0]);

      this._mostRecentNotification = notification;

      const lastId = localDB.getLastRecievedNotificationId();

      if (!notification.isActive || lastId == notification.id) {
        notification = null;
      }

      return notification;

    })).subscribe(notification => {
      this._newNotification$.next(notification);
    });

  }

  showNotification(notification: GloablNotification) {

    if (!notification) {
      notification = this._mostRecentNotification;
    }

    const dialogRef = this.dialog.open(NotificationComponent, {
      data: notification,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dontDisplayAgain => {

      this.localDB.setLastRecievedNotificationId(notification.id);
      this._newNotification$.next(null);

      // if (dontDisplayAgain) {

      // }

    });

  }

  getUnreadNotification() {
    return this._newNotification$;
  }

}
