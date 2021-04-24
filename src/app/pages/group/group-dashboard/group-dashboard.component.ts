import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, JUZ_STATUS, KHITMA_GROUP_TYPE, KhitmaGroup_Sequential, KhitmaGroup_SameTask, KhitmaGroup_Pages } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../../khitma-group.service';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogModel, ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';


import { Overlay, OverlayContainer, ScrollStrategy } from '@angular/cdk/overlay';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Title } from '@angular/platform-browser';
import { AlertService } from 'src/app/alert.service';
import { NativeApiService } from 'src/app/native-api.service';
import { EditKhitmaDetailsComponent } from 'src/app/dialog/edit-khitma-details/edit-khitma-details.component';
import { StartNewKhitmaComponent } from 'src/app/dialog/start-new-khitma/start-new-khitma.component';
import { NativeShareService } from 'src/app/native-share.service';
import { Router } from '@angular/router';
import { NewTaskComponent } from 'src/app/dialog/new-task/new-task.component';
import { StatusMessageGenerators } from './status-messages';
import { Subject } from 'rxjs';
import { Group_SameTask_Component } from './group-types/sametask/sametask.component';


@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GroupDashboardComponent implements OnInit {

  @ViewChild(Group_SameTask_Component) sameTaskGroupChildComponent: Group_SameTask_Component;


  readonly KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;

  group;// : KhitmaGroup_Sequential | KhitmaGroup_SameTask;


  username: string;
  isAdmin: boolean = false;
  showCelebration: boolean = false;
  isGroupInfoExpanded: false;
  isInitiated = false;

  userWatch$: Subject<string> = new Subject();

  inviteMsg = "";
  statusMsg = "";

  constructor(private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title,
    private alert: AlertService,
    private nativeApi: NativeApiService,
    private router: Router,) {
  }

  ngOnInit(): void {

    this.groupsApi.getCurrentGroup().subscribe((group: KhitmaGroup) => {

      this.titleService.setTitle(group.title);

      if (!group) {
        return;
      }


      switch (group.type) {
        case KHITMA_GROUP_TYPE.SAME_TASK: {
          this.group = new KhitmaGroup_SameTask(group);
          break;
        }
        case KHITMA_GROUP_TYPE.SEQUENTIAL: {
          this.group = new KhitmaGroup_Sequential(group);
          break;
        }
        case KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION: {
          this.group = new KhitmaGroup_Pages(group);
          break;
        }
        default: {
          this.group = new KhitmaGroup_Sequential(group);
        }
      }

      this.group.type = this.group.type || KHITMA_GROUP_TYPE.SEQUENTIAL; // compitability

      if (!this.isInitiated) {
        this.username = this.localDB.getUsername(this.group.id);
        this.isAdmin = this.group.isAdmin(this.username);
        this.isInitiated = true;
      }

      this.inviteMsg = "إنضمّوا إلى مجموعة"
        + ' "' + this.group.title + '" '
        + "عبر الرابط "
        + this.group.getURL();

    });

  }

  getKhitmaStatusMsg() {
    return StatusMessageGenerators[this.group.type](this.group);
  }


  celebrate() {
    this.showCelebration = true;

    setTimeout(() => {
      this.showCelebration = false;
    }, 5000);
  }

  shareStatusMsg() {
    this.nativeApi.share(("وضع الختمة: " + this.group.title), this.getKhitmaStatusMsg(), null);
  }

  shareInviteMsg() {
    this.nativeApi.share(("دعوة انضمام: " + this.group.title), this.inviteMsg, null);
  }


  showEditGroupDialog() {

    const dialogRef = this.dialog.open(EditKhitmaDetailsComponent, {
      data: {
        title: this.group.title,
        author: this.group.author,
        descreption: this.group.description,
        targetDate: this.group.targetDate,
        admins: this.group.admins,
      },
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.groupsApi.updateGroupInfo(this.group.id,
          dialogResult.title,
          dialogResult.description,
          dialogResult.targetDate,
          dialogResult.admins
        );

      }

    });

  }

  leaveGroup() {

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(
        "تأكيد ترك المجموعة",
        "لا ننصح بترك المجموعة كي لا يفوتك الثواب العظيم إن شاء الله، لكن في حال تركت المجموعة فسيتم إتاحة جزئك من جديد وتحويلك للصفحة الرئيسية."),
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {

        this.$gaService.event('group_leave');


        this.userWatch$.next('user-leave-group'); // update the children



        this.localDB.archiveGroup(this.group);

        if (this.group.type === KHITMA_GROUP_TYPE.SAME_TASK) {
          this.groupsApi.removeGroupMember(this.group.id, this.username).then(() => {
            this.router.navigate(['/']);

          });

        }
        else {
          this.router.navigate(['/']);

        }

      }

    });

  }


  showNewTaskDialog() {
    this.sameTaskGroupChildComponent.showNewTaskDialog();

  }



}
