import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { KhitmaGroup, KhitmaGroup_Sequential, KHITMA_GROUP_TYPE } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  // encapsulation: ViewEncapsulation.None

})
export class HomeComponent implements OnInit {

  groups: KhitmaGroup[];

  isShowArchive: boolean;

  constructor(private router: Router, private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService, private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService) { }

  ngOnInit(): void {

    let ids = this.localDB.getMyGroups();
    ids = ids.slice(Math.max(ids.length - 10, 0)); // firebase IN array limit of 10

    if (ids.length > 0) {
      this.groupsApi.getGroups(ids).subscribe((groups) => {

        if (!groups) {
          return;
        }

        this.groups = <KhitmaGroup[]>groups;

        this.groups.forEach(group => {

          if (!group.type || group.type == KHITMA_GROUP_TYPE.SEQUENTIAL) {

            let seqKhitma = <KhitmaGroup_Sequential>group;

            const _isV2Api = !Array.isArray(seqKhitma.ajza);

            if (_isV2Api) {
              seqKhitma.ajza = KhitmaGroup_Sequential.convertAjzaToArray(seqKhitma.ajza);
            }

          }

        });

      });


    }

    this.isShowArchive = this.localDB.hasArchive();

  }

  groupCreated(result) {

  }

  archiveGroup(group: KhitmaGroup) {


    const dialogData = new ConfirmDialogModel(
      "تأكيد أرشفة المجموعة",
      'أرشفة مجموعة: "' + group.title + '"؟'
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(confirmed => {

      if (confirmed) {

        this.$gaService.event('group_leave');


        this.localDB.archiveGroup(group);
        this.groups = this.groups.filter(item => item.id !== group.id);
        this.isShowArchive = true;
      }

    });

  }

}
