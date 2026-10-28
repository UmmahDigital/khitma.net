import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { DeadlineChoice, deadlineDate, deadlineText, isoDate } from '../../deadline';
import { KhitmaGroupService } from '../../khitma-group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../alert.service';
import { LocalDatabaseService } from '../../local-database.service';
import { GoogleAnalyticsService } from '../../analytics';
import { ReferralService } from '../../referral.service';
import { KHITMA_GROUP_TYPE } from '../../entities/entities';
import { switchMap } from 'rxjs/operators';
import { CommonService } from '../../service/common.service';
import { UserService } from '../../../app/service/user.service';
import { User } from '../../../app/common/model';

@Component({
    selector: 'app-create-group',
    templateUrl: './create-group.component.html',
    styleUrls: ['./create-group.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CreateGroupComponent implements OnInit {
  @Output() groupCreated = new EventEmitter<object>();

  title: string;
  description: string;
  author: string;
  user: User;
  firstTask: string;

  typeParam: string;
  /** Where the visitor came from (e.g. "completion": a finished khitma's invitation), for analytics. */
  source: string = null;

  deadlineChoice: DeadlineChoice = 'none';
  deadlinePicked: string = null;
  readonly today = isoDate(new Date());

  readonly KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;
  groupType: string = KHITMA_GROUP_TYPE.SAME_TASK;
  isRecurring = true;

  constructor(
    private $gaService: GoogleAnalyticsService,
    private groupsApi: KhitmaGroupService,
    private router: Router,
    private alert: AlertService,
    private localDB: LocalDatabaseService,
    private route: ActivatedRoute,
    public common: CommonService,
    private svcUser: UserService,
    private referral: ReferralService
  ) {}

  ngOnInit(): void {
    this.user = this.svcUser.currentUser;
    if (this.user != null) {
      this.author = this.user.fullName;
    }

    this.route.queryParams.subscribe((params) => {
      this.typeParam = params['type'];
      this.source = params['from'] || null;

      if (!this.typeParam) {
        return;
      }

      let detailedType = this.typeParam.split('.');

      this.isRecurring = detailedType[0] == 'recurring';

      if (this.isRecurring) {
        switch (detailedType[1]) {
          case 'sametask': {
            this.groupType = KHITMA_GROUP_TYPE.SAME_TASK;
            break;
          }
          case 'sequential': {
            this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
            break;
          }
          default: {
            this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
            break;
          }
        }
      } else {
        switch (detailedType[1]) {
          case 'pagesdistribution': {
            this.groupType = KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION;
            break;
          }
          case 'sequential': {
            this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
            break;
          }
          default: {
            this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
            break;
          }
        }
      }
    });
  }

  createGroup() {
    // if (!this.isRecurring) {
    //   this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
    // }

    // Only one-time khitmas have a deadline, even if one was picked before switching the form to recurring.
    const deadlineChoice: DeadlineChoice = this.isRecurring ? 'none' : this.deadlineChoice;
    const targetAt = deadlineDate(deadlineChoice, this.deadlinePicked);

    this.groupsApi
      .createGroup(
        this.title,
        this.description,
        this.author,
        this.groupType,
        this.firstTask,
        targetAt ? { targetAt, targetDate: deadlineText(targetAt) } : null
      )
      .then((docRef) => {
        const groupId = docRef.id;
        this.$gaService.send('group_created', {
          group_id: groupId,
          group_type: this.groupType,
          deadline: deadlineChoice,
          ...(this.source ? { source: this.source } : {}),
        });

        this.alert.show(this.common.translation.gCreate?.success, 5000);
        // Someone who came through a member's link and now starts a khitma of their own: the best outcome of sharing.
        this.referral.credit('started');

        this.localDB.joinGroup(groupId, this.author);

        this.router.navigateByUrl('/group/' + groupId + '/invite');
      });
  }
}
