import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from '../../analytics';
import { KhitmaGroup } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { KhitmaGroupService } from '../../khitma-group.service';
import { SharedModule } from '../../modules/shared.module';
import { CommonService } from '../../service/common.service';
import { fill } from '../../share-messages';

@Component({
    selector: 'app-archive',
    templateUrl: './archive.component.html',
    styleUrls: ['./archive.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule]
})
export class ArchiveComponent implements OnInit {

  archivedGroups;


  constructor(private dialog: MatDialog, private localDB: LocalDatabaseService, private groupsApi: KhitmaGroupService, public common: CommonService) {
  }

  ngOnInit(): void {

    this.archivedGroups = this.localDB.getArchivedGroups();

  }

  clearArchive(group: KhitmaGroup) {

    const dialogData = new ConfirmDialogModel(
      this.common.translation.archive?.cleanConfirm || 'تنظيف الأرشيف؟',
      fill(this.common.translation.archive?.cleanText || 'ستُزال جميع المجموعات من الأرشيف ({count}).', { count: this.archivedGroups.length }),
      this.common.translation.archive?.clean,
      this.common.translation.dialog?.cancel
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80vw"
    });

    dialogRef.afterClosed().subscribe(confirmed => {

      if (confirmed) {
        this.localDB.clearArchive();
        this.archivedGroups = [];
      }

    });


  }

}
