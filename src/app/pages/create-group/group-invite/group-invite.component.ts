import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AlertService } from '../../../alert.service';
import { KhitmaGroup } from '../../../entities/entities';
import { NativeApiService } from '../../../native-api.service';
import { NativeShareService } from '../../../native-share.service';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { CommonService } from '../../../service/common.service';

@Component({
  selector: 'app-group-invite',
  templateUrl: './group-invite.component.html',
  styleUrls: ['./group-invite.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GroupInviteComponent implements OnInit {
  group: KhitmaGroup;
  inviteLink: string;
  inviteMsg: string;

  constructor(
    private route: ActivatedRoute,
    private groupsApi: KhitmaGroupService,
    private alert: AlertService,
    private nativeShare: NativeShareService,
    private nativeApi: NativeApiService,
    public common: CommonService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params: Params): void => {
      const groupId = params.groupId;

      this.groupsApi
        .getGroupDetailsOnce(groupId)
        .subscribe((group: KhitmaGroup) => {
          this.group = group;

          this.inviteLink = this.groupsApi.getGroupURL(this.group.id);

          this.inviteMsg =
            this.common.translation.gInvite?.join +
            ' "' +
            this.group.title +
            '" ' +
            this.common.translation.gInvite?.link +
            '" ' +
            this.inviteLink +
            '\n' +
            this.common.translation.gInvite?.bless;
        });
    });
  }

  msgCopied() {
    this.alert.show(this.common.translation.gInvite?.alert, 5000);
  }

  share() {
    this.nativeApi.share(
      this.common.translation.gInvite?.share,
      this.inviteMsg,
      null
    );
  }
}
