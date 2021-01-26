import { Component, OnInit, Input } from '@angular/core';
import { KhitmaGroup } from '../../entities/entities';
import { KhitmaGroupService } from '../../khitma-group.service';
import { LocalDatabaseService } from '../../local-database.service';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss']
})
export class GroupListComponent implements OnInit {

  @Input() groups: KhitmaGroup[];

  constructor() { }

  ngOnInit(): void {


  }

}
