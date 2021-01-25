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

    this.groupsApi.getCurrentGroup().subscribe(
      (value: KhitmaGroup) => this.group = value
    )

  }

  join() {

    this.localDB.joinGroup(this.group.id, this.username);

    window.location.href = '/group/' + this.group.id + '/dashboard'
    // this.router.navigate(['/group/' + this.group.id + '/dashboard']);
  }


}
