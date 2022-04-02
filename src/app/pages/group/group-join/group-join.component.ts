import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import {
  KhitmaGroup,
  KHITMA_GROUP_TYPE,
  KhitmaGroup_SameTask,
} from '../../../entities/entities';
import { UserService } from '../../../service/user.service';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { LocalDatabaseService } from '../../../local-database.service';

@Component({
  selector: 'app-group-join',
  templateUrl: './group-join.component.html',
  styleUrls: ['./group-join.component.scss'],
})
export class GroupJoinComponent implements OnInit {
  group: KhitmaGroup;
  inviteLink: string;
  username: string;

  constructor(
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private $gaService: GoogleAnalyticsService,
    private router: Router,
    private _ngZone: NgZone,
    private svcUser: UserService
  ) {}

  ngOnInit() {
    this.groupsApi
      .getCurrentGroup()
      .subscribe((value: KhitmaGroup) => (this.group = value));
  }

  join() {
    this.$gaService.event('group_joined');

    let username = KhitmaGroup.refineOwnerName(this.username);

    this.localDB.joinGroup(this.group.id, username);
    this.svcUser.joinToGroup(this.group.id);
    if (
      this.group.type === KHITMA_GROUP_TYPE.SAME_TASK ||
      this.group.type === KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION
    ) {
      this.groupsApi.addGroupMember(this.group.id, username).then(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }

    // this.router.navigate(['/group', this.group.id, 'dashboard']);

    // this._ngZone.run(() => { this.router.navigate(['/group', this.group.id, 'dashboard']) });
  }
}
