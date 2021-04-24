import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { Subject } from 'rxjs';
import { AlertService } from 'src/app/alert.service';
import { NewTaskComponent } from 'src/app/dialog/new-task/new-task.component';
import { GroupMember, KhitmaGroup_SameTask } from 'src/app/entities/entities';
import { KhitmaGroupService } from 'src/app/khitma-group.service';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { NativeApiService } from 'src/app/native-api.service';
import { NativeShareService } from 'src/app/native-share.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

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
    private router: Router,) {
  }



  ngOnInit(): void {

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
        "تأكيد حذف عضو المجموعة",
        ""),
      maxWidth: "80%"
    });

    dialogRef.afterClosed().subscribe(dialogResult => {

      if (dialogResult) {
        this.groupsApi.removeGroupMember(this.group.id, member.name);
        this.alert.show("تمّ حذف  " + member.name + "  بنجاح", 2500);
      }

    });

  }


  addGroupMember(member: GroupMember) {
    this.groupsApi.addGroupMember(this.group.id, member.name);
    this.alert.show("تمّ إضافة  " + member.name + "  بنجاح", 2500);
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
