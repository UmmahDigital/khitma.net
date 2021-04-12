import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GroupMember } from 'src/app/entities/entities';

@Component({
  selector: 'app-group-members',
  templateUrl: './group-members.component.html',
  styleUrls: ['./group-members.component.scss']
})
export class GroupMembersComponent implements OnInit {

  @Input() members: GroupMember;
  @Output() onMemberClick?= new EventEmitter<GroupMember>();


  constructor() { }

  ngOnInit(): void {
  }

  memberClicked(member) {
    this.onMemberClick.emit(member);
  }

}
