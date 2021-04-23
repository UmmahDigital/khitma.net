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

  constructor() { }


  ngOnInit(): void {
  }
}
