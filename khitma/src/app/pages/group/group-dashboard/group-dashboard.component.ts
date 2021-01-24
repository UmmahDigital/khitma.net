import { Component, OnInit } from '@angular/core';
import { KhitmaGroup, Juz } from 'src/app/entities/entities';
import { KhitmaGroupService } from '../../../khitma-group.service';

@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss']
})
export class GroupDashboardComponent implements OnInit {

  group: KhitmaGroup;

  constructor(private groupsApi: KhitmaGroupService) {
  }

  ngOnInit(): void {

    this.groupsApi.currentGroup.subscribe(
      (value: KhitmaGroup) => this.group = value
    )


  }

  juzSelected(juz: Juz) {
    console.log("Dashboard: " + juz.index);
  }
}
