import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Subject } from 'rxjs';
import { AlertService } from '../../../../../alert.service';
import { GroupMember, KhitmaGroup_Pages, NUM_OF_PAGES } from '../../../../../entities/entities';
import { KhitmaGroupService } from '../../../../../khitma-group.service';
import { CommonService } from '../../../../../service/common.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-group-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss']
})
export class Group_Pages_Component implements OnInit {

  @Input() group: KhitmaGroup_Pages;
  @Input() groupWatch$: Subject<KhitmaGroup_Pages>;
  @Input() userWatch$?: Subject<string>;

  @Input() isAdmin: boolean;
  @Input() username: string;

  @Output() onAchievement?= new EventEmitter();

  isMembersListEditMode = false;
  showGroupMembers = true;

  myMember;
  counts;
  totalDoneTasks;

  constructor(private groupsApi: KhitmaGroupService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private alert: AlertService, public common: CommonService) { }


  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.myMember = this.group.createGroupMember(this.username);
    this.counts = this.group.getCounts();
  }

  taskToggled(isDone: boolean) {

    this.groupsApi.updateMemberTask(this.group.id, this.username, isDone);

    if (isDone) {
      this.onAchievement.emit();
    }

    this.$gaService.event(isDone ? 'task_done' : 'task_undone', 'tasks', (<KhitmaGroup_Pages>this.group).task);

  }



  toggleMemberTaskState(member: GroupMember) {

    if (!this.isAdmin) {
      return;
    }

    member.isTaskDone = !member.isTaskDone;
    this.groupsApi.updateMemberTask(this.group.id, member.name, member.isTaskDone);


    this.$gaService.event(member.isTaskDone ? 'task_done' : 'task_undone', 'tasks', (<KhitmaGroup_Pages>this.group).task);


  }

  removeGroupMember(member: GroupMember) {


    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: new ConfirmDialogModel(
        this.common.translation.gPages?.confirm,
        ""),
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {
        this.groupsApi.removeGroupMember(this.group.id, member.name);
        this.alert.show(this.common.translation.gPages?.deleted + member.name + this.common.translation.gPages?.success, 2500);
      }

    });

  }


  addGroupMember(member: GroupMember) {
    this.groupsApi.addGroupMember(this.group.id, member.name);

    this.alert.show(this.common.translation.gPages?.add + member.name + this.common.translation.gPages?.success, 2500);

  }

  start() {

    this._distributePages();
    // this.groupsApi.updateGroupMembers(this.group.id, this.group.getMembersObj());

    // this.groupsApi.updateGroupStartStatus(this.group.id, true);


    this.groupsApi.updatePagesAndStart(this.group.id, this.group.getMembersObj());

    this.alert.show(this.common.translation.gPages?.started, 5000);


  }

  restart() {
    this.start();

    this.alert.show(this.common.translation.gPages?.restart, 5000);

  }

  private _distributePages() {

    const membersCount = this.group.members.length;
    const pagesCount = NUM_OF_PAGES;

    const pagesPerMember = Math.floor(pagesCount / membersCount);

    let extraPages = pagesCount - (membersCount * pagesPerMember);

    let lastDistributedPage = -1;

    this.group.members.forEach((member, index) => {

      let startPage = lastDistributedPage + 1;
      let endPage = startPage + pagesPerMember - 1;

      if (extraPages > 0) {
        endPage++;
        extraPages--;
      }

      member.pagesTask = {
        start: startPage,
        end: endPage,
      };

      lastDistributedPage = endPage;

    });


  }

}
