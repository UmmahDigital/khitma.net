import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  promptEvent;

  constructor(private swUpdate: SwUpdate, private dialog: MatDialog) {

    window.addEventListener('beforeinstallprompt', event => {
      this.promptEvent = event;
    });


    swUpdate.available.subscribe(event => {



      const dialogData = new ConfirmDialogModel("تحديث البرنامج",
        "هناك نسخة جديدة من الموقع، هل تريد استخدامها الآن. التحديث لا يؤثّر على مجموعاتك أو أجزائك.   ");

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: dialogData,
        maxWidth: "80%"
      });

      dialogRef.afterClosed().subscribe(dialogResult => {

        if (dialogResult) {
          window.location.reload();

        }

      });


    });
  }
}
