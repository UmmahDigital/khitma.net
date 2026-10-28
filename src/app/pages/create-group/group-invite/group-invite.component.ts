import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AlertService } from '../../../alert.service';
import { KhitmaGroup } from '../../../entities/entities';
import { SharingService } from '../../../sharing.service';
import { ReferralService } from '../../../referral.service';
import { inviteMessage } from '../../../share-messages';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { CommonService } from '../../../service/common.service';

@Component({
    selector: 'app-group-invite',
    templateUrl: './group-invite.component.html',
    styleUrls: ['./group-invite.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class GroupInviteComponent implements OnInit {
  group: KhitmaGroup;
  inviteLink: string;
  inviteMsg: string;

  constructor(
    private route: ActivatedRoute,
    private groupsApi: KhitmaGroupService,
    private alert: AlertService,
    private sharing: SharingService,
    private referral: ReferralService,
    public common: CommonService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params: Params): void => {
      const groupId = params.groupId;

      this.groupsApi
        .getGroupDetailsOnce(groupId)
        .subscribe((group: KhitmaGroup) => {
          this.group = group;

          this.inviteLink = this.referral.groupUrl(this.group.id);

          this.inviteMsg = inviteMessage(this.common.translation, this.group.title, this.inviteLink);
        });
    });
  }

  sendOnWhatsApp() {
    this.sharing.whatsapp(this.inviteMsg, 'invite', this.group.id);
  }

  share() {
    this.sharing.share(this.common.translation.gInvite?.share, this.inviteMsg, 'invite', this.group.id);
  }

  copy() {
    this.sharing.copy(this.inviteMsg, 'invite', this.group.id);
  }
}
