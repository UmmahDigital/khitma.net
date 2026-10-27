import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from '../../analytics';
import { KhitmaGroup } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit {

  archivedGroups;


  constructor(private dialog: MatDialog, private localDB: LocalDatabaseService, private groupsApi: KhitmaGroupService,) {
  }

  ngOnInit(): void {

    this.archivedGroups = this.localDB.getArchivedGroups();

  }

  clearArchive(group: KhitmaGroup) {

    const dialogData = new ConfirmDialogModel(
      "تأكيد تنظيف الأرشيف",
      "تنظيف " + this.archivedGroups.length + " مجموعة من الأرشيف؟"
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(confirmed => {

      if (confirmed) {
        this.localDB.clearArchive();
        this.archivedGroups = [];
      }

    });


  }

}
