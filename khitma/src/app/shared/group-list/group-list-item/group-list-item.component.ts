import { Component, Input, OnInit } from '@angular/core';
import { KhitmaGroupService } from '../../../../app/khitma-group.service';
import { JUZ_STATUS } from '../../../entities/entities';

@Component({
  selector: 'app-group-list-item',
  templateUrl: './group-list-item.component.html',
  styleUrls: ['./group-list-item.component.scss']
})
export class GroupListItemComponent implements OnInit {

  @Input() group;

  link;

  progress = {
    done: 0,
    booked: 0,
    idle: 0
  };

  constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {

    this.progress = this.calcProgress();

    this.link = this.groupsApi.getGroupURL(this.group.id);
  }

  calcProgress() {

    let counters = {
      done: 0,
      booked: 0,
      idle: 0
    };;

    for (let i = 0, len = this.group.ajza.length; i < len; i++) {

      switch (this.group.ajza[i].status) {
        case JUZ_STATUS.IDLE: counters["idle"]++; break;
        case JUZ_STATUS.BOOKED: counters["booked"]++; break;
        case JUZ_STATUS.DONE: counters["done"]++; break;
      };
    }

    return counters;

  }

}
