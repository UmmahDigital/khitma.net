import { Component, OnInit, Host } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { LocalDatabaseService } from '../../../local-database.service';
import { GroupComponent } from '../group.component';

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
    private route: ActivatedRoute,
    private router: Router,
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    @Host() parent: GroupComponent) {

    this.group = parent.group;

  }

  ngOnInit() {

  }

  join() {
    this.localDB.setUserName(this.username);
    this.localDB.insertGroup(this.group.id);
    this.router.navigate(['/group/' + this.group.id + '/dashboard']);

  }


}
