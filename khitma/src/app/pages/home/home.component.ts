import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class HomeComponent implements OnInit {

  constructor(private router: Router, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {
  }

  groupCreated(result) {

    // this.localDB.joinGroup(result.groupId, result.username);

    // window.location.href = '/group/' + result.groupId + '/dashboard/invite';

    //  // this.router.navigate(['/group/' + groupId + '/dashboard/invite']);

  }

}
