import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDatabaseService } from 'src/app/local-database.service';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private router: Router, private localDB: LocalDatabaseService) { }

  ngOnInit(): void {
  }

  groupCreated(groupId) {

    this.localDB.insertGroup(groupId);
    this.router.navigate(['/group/' + groupId + '/dashboard/invite']);

  }

}
