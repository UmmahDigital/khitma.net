import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { Location, LocationStrategy } from '@angular/common';


@Component({
  selector: 'app-group-invite',
  templateUrl: './group-invite.component.html',
  styleUrls: ['./group-invite.component.scss']
})
export class GroupInviteComponent implements OnInit {

  group: KhitmaGroup;
  inviteLink: string;

  constructor(private route: ActivatedRoute, private groupsApi: KhitmaGroupService, private locationStrategy: LocationStrategy) { }

  ngOnInit() {

    this.route.params.subscribe(
      (params: Params): void => {

        const groupId = params.groupId;

        this.groupsApi.getGroupDetails(groupId).subscribe((group: KhitmaGroup) => {
          this.group = group;

          this.inviteLink = location.origin + '/groups/' + this.group.id + "/join";

          // this.inviteLink = this.locationStrategy.getBaseHref() + '/groups/' + this.group.id + "/join";
        });

      });

  }

}
