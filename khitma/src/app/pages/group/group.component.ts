import { Component, OnInit } from '@angular/core';
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
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  public group: KhitmaGroup;

  constructor(private route: ActivatedRoute,
    private router: Router,
    private groupsApi: KhitmaGroupService,
    private localDB: LocalDatabaseService,
    private alert: AlertService) { }


  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params): void => {

        const groupId = params.groupId;

        this.groupsApi.getGroupDetails(groupId).subscribe((group: KhitmaGroup) => {

          if (!this.groupsApi.isValidGroup(group)) {
            this.alert.show("لم يتم العثور على الختمة المطلوبة.");
            this.router.navigate(['notfound']);
          }

          this.group = group;

          const isJoind = this.localDB.isGroupJoined(groupId);

          const redirecTo = isJoind ? '/dashboard' : '/join';

          this.router.navigate(['/group/' + groupId + redirecTo]);

        });

      });
  }

}
