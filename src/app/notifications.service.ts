import { Inject, Injectable } from '@angular/core';
import { collection, Firestore, limit, orderBy, query } from 'firebase/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GloablNotification } from './entities/notification';
import { FIRESTORE, watchQuery } from './firestore';
import { LocalDatabaseService } from './local-database.service';
import { NotificationComponent } from './shared/notification/notification.component';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private _newNotification$ = new Subject();
  private _mostRecentNotification: GloablNotification = null;

  constructor(@Inject(FIRESTORE) private db: Firestore, private localDB: LocalDatabaseService, private dialog: MatDialog) {

    watchQuery(query(collection(this.db, 'notifications'), orderBy('id', 'desc'), limit(1)), 'id').pipe(map(_notifications => {

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
      maxWidth: "80vw"
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
