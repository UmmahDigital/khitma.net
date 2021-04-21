import { Component, OnInit, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { KhitmaGroupService } from '../../khitma-group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../alert.service';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { KHITMA_GROUP_TYPE } from 'src/app/entities/entities';
import { switchMap } from 'rxjs/operators';


@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class CreateGroupComponent implements OnInit {

  @Output() groupCreated = new EventEmitter<object>();

  title: string;
  description: string;
  author: string;

  firstTask: string;

  typeParam: string;

  readonly KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;
  groupType = KHITMA_GROUP_TYPE.SAME_TASK;
  isRecurring = true;

  constructor(private $gaService: GoogleAnalyticsService,
    private groupsApi: KhitmaGroupService,
    private router: Router,
    private alert: AlertService,
    private localDB: LocalDatabaseService,
    private route: ActivatedRoute) { }

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      this.typeParam = params['type'];

      if (!this.typeParam) {
        return;
      }

      let detailedType = this.typeParam.split(".");

      this.isRecurring = (detailedType[0] == 'recurring');

      if (this.isRecurring) {

        switch (detailedType[1]) {
          case 'sametask': { this.groupType = KHITMA_GROUP_TYPE.SAME_TASK; break; }
          case 'sequential': { this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL; break; }
          default: { this.groupType = KHITMA_GROUP_TYPE.SAME_TASK; break; }

        }
      }
      else {
        this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
      }

    });

  }

  createGroup() {

    if (!this.isRecurring) {
      this.groupType = KHITMA_GROUP_TYPE.SEQUENTIAL;
    }

    this.groupsApi.createGroup(this.title, this.description, this.author, this.groupType, this.firstTask).then(docRef => {

      const groupId = docRef.id;

      this.$gaService.event('group_created');

      this.alert.show("تمّ إنشاء مجموعة الختمة بنجاح!", 5000);


      this.localDB.joinGroup(groupId, this.author);

      this.router.navigateByUrl('/group/' + groupId + '/invite');


    });
  }



}

