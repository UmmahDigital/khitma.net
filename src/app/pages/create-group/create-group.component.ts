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
import { isRamadanSeason, ramadanLastDay } from '../../ramadan';
import { RoundSchedule, ruleText, scheduleFromParams } from '../../schedule';
import { KHITMA_CYCLE_TYPE } from '../../entities/entities';
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
import { SharedModule } from '../../modules/shared.module';

@Component({
    selector: 'app-create-group',
    templateUrl: './create-group.component.html',
    styleUrls: ['./create-group.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule]
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

  /** "ramadan-daily": a khitma that starts again every day of Ramadan, everyone moving to the next juz. */
  template: 'ramadan-daily' | null = null;
  /** How the khitma repeats, when the link asks for it («ابدأ ختمة مثلها», start-like.ts); recurring khitmas only. */
  schedule: RoundSchedule | null = null;
  /** The deadline the form suggested for a Ramadan khitma (the last day of Ramadan), until the creator picks another. */
  private suggestedDeadline: string | null = null;

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
      this.template = params['template'] === 'ramadan-daily' ? 'ramadan-daily' : null;
      this.schedule = scheduleFromParams(params);
      if (ONE_TIME_PURPOSES.includes(params['purpose'])) {
        this.purpose = params['purpose'];
        this.updateTitle();
        this.suggestRamadanDeadline();
      }

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

      if (this.template && !this.title) {
        this.title = this.common.translation.ramadan?.dailyTitle || 'ختمة رمضان اليومية';
      }
    });
  }

  purposeLabel(purpose: Purpose): string {
    return purposeLabel(purpose, this.common.translation);
  }

  /** The schedule this khitma will have: only recurring khitmas that share out ajza repeat on a rhythm. */
  private get scheduleToSave(): RoundSchedule | null {
    if (this.template) {
      return { every: 'day', cycleType: KHITMA_CYCLE_TYPE.AUTO_BOOK };
    }
    return this.isRecurring && this.groupType === KHITMA_GROUP_TYPE.SEQUENTIAL ? this.schedule : null;
  }

  get scheduleLine(): string | null {
    return this.template || !this.scheduleToSave ? null : ruleText(this.scheduleToSave, this.common.translation, this.common.currentLanguage);
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
    this.suggestRamadanDeadline();
  }

  /** A khitma for Ramadan, made during the season, is suggested to finish by the last day of Ramadan. */
  private suggestRamadanDeadline() {
    const untouched = this.deadlineChoice === 'none' || (this.deadlineChoice === 'date' && this.deadlinePicked === this.suggestedDeadline);
    if (!untouched) {
      return;
    }
    const today = new Date();
    const last = this.purpose === 'ramadan' && isRamadanSeason(today) ? ramadanLastDay(today) : null;
    if (last) {
      this.suggestedDeadline = isoDate(last);
      this.deadlineChoice = 'date';
      this.deadlinePicked = this.suggestedDeadline;
    } else if (this.suggestedDeadline) {
      this.suggestedDeadline = null;
      this.deadlineChoice = 'none';
      this.deadlinePicked = null;
    }
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
    const purpose = this.template ? 'ramadan' : this.isRecurring ? 'regular' : this.purpose;
    const schedule = this.scheduleToSave;
    const honoreeGender = !this.isRecurring && namesSomeone(this.purpose) ? this.honoreeGender : undefined;

    this.groupsApi
      .createGroup(
        this.title,
        this.description,
        this.author,
        this.groupType,
        this.firstTask,
        targetAt ? { targetAt, targetDate: deadlineText(targetAt) } : null,
        purpose ? { purpose, honoreeGender } : null,
        schedule
      )
      .then((docRef) => {
        const groupId = docRef.id;
        this.$gaService.send('group_created', {
          group_id: groupId,
          group_type: this.groupType,
          deadline: deadlineChoice,
          purpose: purpose ?? 'unset',
          ...(this.template ? { template: 'ramadan_daily' } : {}),
          ...(schedule && !this.template ? { schedule: schedule.every } : {}),
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
