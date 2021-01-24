import { Component, OnInit } from '@angular/core';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';
import { Location, LocationStrategy } from '@angular/common';

@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss']
})
export class GroupDashboardComponent implements OnInit {

  group: KhitmaGroup;

  constructor(private route: ActivatedRoute, private router: Router, private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params): void => {
        const groupId = params.groupId;

        this.groupsApi.getGroupDetails(groupId).subscribe((group: KhitmaGroup) => {
          this.group = group;
        });

      });
  }
}
