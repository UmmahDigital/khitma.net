import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { KhitmaGroup } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class HomeComponent implements OnInit {

  groups: KhitmaGroup[];

  constructor(private router: Router, private groupsApi: KhitmaGroupService, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {

    let ids = this.localDB.getMyGroups();
    ids = ids.slice(Math.max(ids.length - 10, 0)); // firebase IN array limit of 10

    this.groupsApi.getGroups(ids).subscribe((groups) => {

      if (!groups) {
        return;
      }

      this.groups = <KhitmaGroup[]>groups;

    });


  }

  groupCreated(result) {

    // this.localDB.joinGroup(result.groupId, result.username);

    // window.location.href = '/group/' + result.groupId + '/dashboard/invite';

    //  // this.router.navigate(['/group/' + groupId + '/dashboard/invite']);

  }

}
