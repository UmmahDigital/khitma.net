import { Component, OnInit } from '@angular/core';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { LocalDatabaseService } from '../../../local-database.service';

@Component({
  selector: 'app-group-join',
  templateUrl: './group-join.component.html',
  styleUrls: ['./group-join.component.scss']
})
export class GroupJoinComponent implements OnInit {

  group: KhitmaGroup;
  inviteLink: string;
  username: string;

  constructor(
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService) {

  }

  ngOnInit() {

    this.groupsApi.currentGroup.subscribe(
      (value: KhitmaGroup) => this.group = value
    )

  }

  join() {
    this.localDB.setUserName(this.username);
    this.localDB.insertGroup(this.group.id);
    // this.router.navigate(['/group/' + this.group.id + '/dashboard']);

    window.location.href = '/group/' + this.group.id + '/dashboard'

  }


}
