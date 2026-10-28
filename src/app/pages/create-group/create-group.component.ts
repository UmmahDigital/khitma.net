import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { DeadlineChoice, deadlineDate, deadlineText, isoDate } from '../../deadline';
import { HonoreeGender, namesSomeone, ONE_TIME_PURPOSES, Purpose, purposeLabel, purposeTitle } from '../../purpose';
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
  groupType: string = KHITMA_GROUP_TYPE.SEQUENTIAL;
  isRecurring = true;
  /** Page distribution and same-task khitmas are less common: their choice waits under "more options". */
  showTypes = false;

  /** What a one-time khitma is for; memorial and healing khitmas name someone, and the title is written for them. */
  readonly purposes = ONE_TIME_PURPOSES;
  purpose: Purpose | null = null;
  honoreeName = '';
  honoreeGender: HonoreeGender = 'male';
  /** The last title the form wrote; once the creator types their own, the form leaves it alone. */
  private generatedTitle = '';

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
      // A link that asks for one of the less common types shows that choice.
      this.showTypes = detailedType[1] === 'sametask' || detailedType[1] === 'pagesdistribution';

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

  purposeLabel(purpose: Purpose): string {
    return purposeLabel(purpose, this.common.translation);
  }

  get namesSomeone(): boolean {
    return namesSomeone(this.purpose);
  }

  get honoreeLabel(): string {
    const t = this.common.translation.purpose ?? {};
    return this.purpose === 'memorial' ? t.memorialName || 'اسم المتوفّى' : t.healingName || 'اسم المريض';
  }

  /** رحمه الله / رحمها الله, or شفاه الله / شفاها الله. */
  get genderOptions(): { id: HonoreeGender; label: string }[] {
    const t = this.common.translation.purpose ?? {};
    return this.purpose === 'memorial'
      ? [
          { id: 'male', label: t.memorialMale || 'رحمه الله' },
          { id: 'female', label: t.memorialFemale || 'رحمها الله' },
        ]
      : [
          { id: 'male', label: t.healingMale || 'شفاه الله' },
          { id: 'female', label: t.healingFemale || 'شفاها الله' },
        ];
  }

  choosePurpose(purpose: Purpose) {
    this.purpose = this.purpose === purpose ? null : purpose;
    this.updateTitle();
  }

  chooseGender(gender: HonoreeGender) {
    this.honoreeGender = gender;
    this.updateTitle();
  }

  /** Writes the title from the purpose and name, unless the creator has written their own. */
  updateTitle() {
    if (this.title && this.title !== this.generatedTitle) {
      return;
    }
    this.generatedTitle = purposeTitle(this.purpose, this.honoreeName, this.honoreeGender, this.common.translation) ?? '';
    this.title = this.generatedTitle;
  }

  createGroup() {
    // if (!this.isRecurring) {
    //   this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
    // }

    // Only one-time khitmas have a deadline, even if one was picked before switching the form to recurring.
    const deadlineChoice: DeadlineChoice = this.isRecurring ? 'none' : this.deadlineChoice;
    const targetAt = deadlineDate(deadlineChoice, this.deadlinePicked);
    const purpose = this.isRecurring ? 'regular' : this.purpose;
    const honoreeGender = !this.isRecurring && namesSomeone(this.purpose) ? this.honoreeGender : undefined;

    this.groupsApi
      .createGroup(
        this.title,
        this.description,
        this.author,
        this.groupType,
        this.firstTask,
        targetAt ? { targetAt, targetDate: deadlineText(targetAt) } : null,
        purpose ? { purpose, honoreeGender } : null
      )
      .then((docRef) => {
        const groupId = docRef.id;
        this.$gaService.send('group_created', {
          group_id: groupId,
          group_type: this.groupType,
          deadline: deadlineChoice,
          purpose: purpose ?? 'unset',
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
