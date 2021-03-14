import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../khitma-group.service';
import { Location, LocationStrategy } from '@angular/common';
import { AlertService } from 'src/app/alert.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class GroupComponent implements OnInit {

  constructor(private route: ActivatedRoute,
    private router: Router,
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private alert: AlertService) { }


  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params): void => {

        const groupId = params.groupId;

        this.groupsApi.setCurrentGroup(groupId).subscribe((group) => {

          if (!this.groupsApi.isValidGroup(group)) {
            this.alert.show("لم يتم العثور على الختمة المطلوبة.");
            this.router.navigate(['/']);
            return;

          }

          const isJoind = this.localDB.isGroupJoined(groupId);
          const redirecTo = isJoind ? 'dashboard' : 'join';

          if (!this.router.url.includes(redirecTo)) {
            this.router.navigate(['group', groupId, redirecTo]);


          }

        });

      });
  }

}
