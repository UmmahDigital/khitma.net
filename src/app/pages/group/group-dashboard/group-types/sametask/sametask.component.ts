import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Subject } from 'rxjs';
import { AlertService } from '../../../../../alert.service';
import { NewTaskComponent } from '../../../../../dialog/new-task/new-task.component';
import { GroupMember, KhitmaGroup_SameTask } from '../../../../../entities/entities';
import { KhitmaGroupService } from '../../../../../khitma-group.service';
import { LocalDatabaseService } from '../../../../../local-database.service';
import { NativeApiService } from '../../../../../native-api.service';
import { NativeShareService } from '../../../../../native-share.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../../../../shared/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../../service/common.service';

@Component({
  selector: 'app-group-sametask',
  templateUrl: './sametask.component.html',
  styleUrls: ['./sametask.component.scss']
})
export class Group_SameTask_Component implements OnInit, OnChanges {

  @Input() group: KhitmaGroup_SameTask;
  @Input() groupWatch$: Subject<KhitmaGroup_SameTask>;
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
    private localDB: LocalDatabaseService,
    private dialog: MatDialog,
    private $gaService: GoogleAnalyticsService,
    private titleService: Title,
    private alert: AlertService,
    private nativeApi: NativeApiService,
    private nativeShare: NativeShareService,
    private router: Router, public common: CommonService) {


  }



  ngOnInit(): void {
    // this.showGroupMembers = this.isAdmin;

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.myMember = this.group.createGroupMember(this.username);
    this.counts = this.group.getCounts();
    this.totalDoneTasks = this.group.totalDoneTasks || 0;
  }

  taskToggled(isDone: boolean) {

    this.groupsApi.updateMemberTask(this.group.id, this.username, isDone);

    if (isDone) {
      this.onAchievement.emit();
    }

    this.$gaService.event(isDone ? 'task_done' : 'task_undone', 'tasks', (<KhitmaGroup_SameTask>this.group).task);

  }


  updateTask(newTask) {

    let tmpGroup = (<KhitmaGroup_SameTask>this.group);
    tmpGroup.resetMembersTaskStatus();

    let membersObj = tmpGroup.getMembersObj();

    this.groupsApi.updateGroupTask(this.group.id, newTask, this.group.cycle, membersObj);

    this.$gaService.event('new_task', 'tasks', newTask);

  }


  toggleMemberTaskState(member: GroupMember) {

    if (!this.isAdmin) {
      return;
    }

    member.isTaskDone = !member.isTaskDone;
    this.groupsApi.updateMemberTask(this.group.id, member.name, member.isTaskDone);


    this.$gaService.event(member.isTaskDone ? 'task_done' : 'task_undone', 'tasks', (<KhitmaGroup_SameTask>this.group).task);


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


  showNewTaskDialog() {
    const dialogRef = this.dialog.open(NewTaskComponent, {
      width: "90%"
    });

    dialogRef.afterClosed().subscribe(newTask => {

      if (newTask) {

        this.updateTask(newTask);

      }

    });

  }

}
