import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { CommonService } from './service/common.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  promptEvent;

  constructor(private swUpdate: SwUpdate, private dialog: MatDialog, private common: CommonService) {

    window.addEventListener('beforeinstallprompt', event => {
      this.promptEvent = event;
    });


    swUpdate.available.subscribe(event => {

      const dialogData = new ConfirmDialogModel(this.common.translation.dialog?.update, this.common.translation.dialog?.updateDesc
      );

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
