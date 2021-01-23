import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
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

  constructor(private route: ActivatedRoute, private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService) { }

  ngOnInit() {

    // if already joined --> redirect to /page/id page

    this.route.params.subscribe(
      (params: Params): void => {

        const groupId = params.groupId;

        this.groupsApi.getGroupDetails(groupId).subscribe((group: KhitmaGroup) => {
          this.group = group;
        });

      });

  }

  join() {
    this.localDB.setUserName(this.username);
  }


}
