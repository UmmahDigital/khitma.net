import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../../khitma-group.service';

@Component({
  selector: 'app-group-dashboard',
  templateUrl: './group-dashboard.component.html',
  styleUrls: ['./group-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GroupDashboardComponent implements OnInit {

  group: KhitmaGroup;
  myJuzIndex: number;
  username: string;

  constructor(private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService) {
  }

  ngOnInit(): void {

    this.groupsApi.getCurrentGroup().subscribe((group: KhitmaGroup) => {

      if (!group) {
        return;
      }

      this.group = group;


      this.myJuzIndex = this.localDB.getMyJuz(this.group.id);

      if (this.myJuzIndex && group.ajza[this.myJuzIndex].status == JUZ_STATUS.DONE) {
        this.myJuzIndex = null;
      }

      this.username = this.localDB.getUsername(this.group.id);

    });

  }

  juzSelected(juz: Juz) {

    if (juz.status != JUZ_STATUS.IDLE || this.myJuzIndex != null) {
      return;
    }

    this.myJuzIndex = juz.index;

    this.localDB.setMyJuz(this.group.id, juz.index);
    this.groupsApi.updateJuz(this.group.id, juz.index, this.username, JUZ_STATUS.BOOKED);
  }

  juzDone() {
    // add confirmation modal
    this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.DONE);
    this.localDB.setMyJuz(this.group.id, null);
    this.myJuzIndex = null;

  }

  juzGiveup() {
    // add confirmation modal
    this.groupsApi.updateJuz(this.group.id, this.myJuzIndex, this.username, JUZ_STATUS.IDLE);
    this.localDB.setMyJuz(this.group.id, null);
    this.myJuzIndex = null;
  }
}
