import { Component, Input, OnInit } from '@angular/core';
import { KhitmaGroupService } from '../../../../app/khitma-group.service';
import { GroupMember, JUZ_STATUS, KHITMA_GROUP_TYPE } from '../../../entities/entities';

@Component({
  selector: 'app-group-list-item',
  templateUrl: './group-list-item.component.html',
  styleUrls: ['./group-list-item.component.scss']
})
export class GroupListItemComponent implements OnInit {

  @Input() group;

  link;

  progress;

  constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {


    switch (this.group.type) {
      case KHITMA_GROUP_TYPE.SAME_TASK: {
        this.progress = this.calcProgress_SameTask();
        break;
      }
      case KHITMA_GROUP_TYPE.SEQUENTIAL: {
        this.progress = this.calcProgress_Sequential();
        break;
      }
      case KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION: {
        this.progress = this.calcProgress_SameTask();
        break;
      }
      default: {
        this.progress = this.calcProgress_Sequential();
      }
    }



    this.link = this.groupsApi.getGroupURL(this.group.id);
  }

  calcProgress_Sequential() {

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


  calcProgress_SameTask() {

    let counters = {
      done: 0,
      idle: 0
    };

    for (let [name, value] of Object.entries(this.group.members)) {

      let m = <GroupMember>value;

      if (m.isTaskDone) {
        counters["done"]++;
      }
      else {
        counters["idle"]++;
      }

    }

    return counters;

  }


}
