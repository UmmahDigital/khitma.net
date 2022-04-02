import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { KhitmaGroupService } from '../../khitma-group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../alert.service';
import { LocalDatabaseService } from '../../local-database.service';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { KHITMA_GROUP_TYPE } from '../../entities/entities';
import { switchMap } from 'rxjs/operators';
import { CommonService } from '../../service/common.service';
import { UserService } from 'src/app/service/user.service';
import { User } from 'src/app/common/model';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CreateGroupComponent implements OnInit {
  @Output() groupCreated = new EventEmitter<object>();

  title: string;
  description: string;
  author: string;
  user: User;
  firstTask: string;

  typeParam: string;

  readonly KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;
  groupType = KHITMA_GROUP_TYPE.SAME_TASK;
  isRecurring = true;

  constructor(
    private $gaService: GoogleAnalyticsService,
    private groupsApi: KhitmaGroupService,
    private router: Router,
    private alert: AlertService,
    private localDB: LocalDatabaseService,
    private route: ActivatedRoute,
    public common: CommonService,
    private svcUser: UserService
  ) {}

  ngOnInit(): void {
    this.user = this.svcUser.currentUser;
    if (this.user != null) {
      this.author = this.user.fullName;
    }

    this.route.queryParams.subscribe((params) => {
      this.typeParam = params['type'];

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

    this.groupsApi
      .createGroupForUser(
        this.title,
        this.description,
        this.author,
        this.user?.email,
        this.groupType,
        this.firstTask
      )
      .then((docRef) => {
        const groupId = docRef.id;
        this.svcUser.joinToGroup(groupId);
        this.$gaService.event('group_created');

        this.alert.show(this.common.translation.gCreate?.success, 5000);

        this.localDB.joinGroup(groupId, this.author);

        this.router.navigateByUrl('/group/' + groupId + '/invite');
      });
  }
}
