import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
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
    private localDB: LocalDatabaseService,
    private $gaService: GoogleAnalyticsService,
    private router: Router,
    private _ngZone: NgZone) {
  }

  ngOnInit() {

    this.groupsApi.getCurrentGroup().subscribe(
      (value: KhitmaGroup) => this.group = value
    )

  }

  join() {

    this.$gaService.event('group_joined');

    this.localDB.joinGroup(this.group.id, KhitmaGroup.refineOwnerName(this.username));

    // this.router.navigate(['/group', this.group.id, 'dashboard']);

    // this._ngZone.run(() => { this.router.navigate(['/group', this.group.id, 'dashboard']) });

    window.location.reload();


  }


}
