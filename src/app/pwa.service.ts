import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

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


    // Ask once the new version has been downloaded and is ready to use.
    swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {

      const dialogData = new ConfirmDialogModel(this.common.translation.dialog?.update, this.common.translation.dialog?.updateDesc
      );

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: dialogData,
        maxWidth: "80vw"
      });

      dialogRef.afterClosed().subscribe(dialogResult => {

        if (dialogResult) {
          window.location.reload();

        }

      });


    });
  }
}
