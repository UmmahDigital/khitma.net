import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';


@Component({
  selector: 'app-group-invite',
  templateUrl: './group-invite.component.html',
  styleUrls: ['./group-invite.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GroupInviteComponent implements OnInit {

  group: KhitmaGroup;
  inviteLink: string;
  inviteMsg: string;

  constructor(private route: ActivatedRoute,
    private groupsApi: KhitmaGroupService) { }

  ngOnInit() {

    this.route.params.subscribe(
      (params: Params): void => {

        const groupId = params.groupId;

        this.groupsApi.getGroupDetailsOnce(groupId).subscribe((group: KhitmaGroup) => {
          this.group = group;

          this.inviteLink = this.groupsApi.getGroupURL(this.group.id);

          // this.inviteMsg = "انضمّوا إلى ${this.group.title} عبر الرابط ${this.inviteLink} \
          // \r\n \r\n ختمة.نت\
          // \
          // ";

          this.inviteMsg = "إنضمّوا إلى"
            + ' "' + this.group.title + '" '
            + "عبر الرابط "
            + this.inviteLink;

          // this.inviteMsg = "انضمّوا إلى ${this.group.title} عبر الرابط ${this.inviteLink}";

          // this.inviteMsg = this.inviteLink;

        });

      });

  }

}
