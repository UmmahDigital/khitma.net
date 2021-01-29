import { Component, OnInit, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { KhitmaGroupService } from '../../khitma-group.service';
import { Router } from '@angular/router';
import { AlertService } from '../../alert.service';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { GoogleAnalyticsService } from 'ngx-google-analytics';


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

  constructor(private $gaService: GoogleAnalyticsService, private groupsApi: KhitmaGroupService, private router: Router, private alert: AlertService, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {
  }

  createGroup() {

    this.groupsApi.createGroup(this.title, this.description, this.author,).then(docRef => {

      const groupId = docRef.id;

      this.$gaService.event('group_created');

      this.alert.show("تمّ إنشاء مجموعة الختمة بنجاح!", 5000);


      this.localDB.joinGroup(groupId, this.author);


      // window.location.href = '/group/' + result.groupId + '/dashboard/invite';
      //   this.groupCreated.emit({ "groupId": groupId, "username": this.author });



      this.router.navigateByUrl('/group/' + groupId + '/invite');


    });
  }



}
