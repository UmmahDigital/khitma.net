import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AlertService } from '../../../alert.service';
import { KhitmaGroup, KHITMA_GROUP_TYPE } from '../../../entities/entities';
import { SharingService } from '../../../sharing.service';
import { ReferralService } from '../../../referral.service';
import { inviteMessage } from '../../../share-messages';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { CommonService } from '../../../service/common.service';
import { SharedModule } from '../../../modules/shared.module';
import { QrCodeComponent } from '../../../shared/qr-code/qr-code.component';

@Component({
    selector: 'app-group-invite',
    templateUrl: './group-invite.component.html',
    styleUrls: ['./group-invite.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule, QrCodeComponent]
})
export class GroupInviteComponent implements OnInit {
  group: KhitmaGroup;
  inviteLink: string;
  inviteMsg: string;

  /** The big screen shows ajza; same-task and page groups don't have them. */
  get sharesAjza(): boolean {
    return !this.group?.type || this.group.type === KHITMA_GROUP_TYPE.SEQUENTIAL;
  }

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
