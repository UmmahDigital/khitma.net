import { Component, Input, OnInit } from '@angular/core';
import { GroupMember } from 'src/app/entities/entities';

@Component({
  selector: 'app-group-members',
  templateUrl: './group-members.component.html',
  styleUrls: ['./group-members.component.scss']
})
export class GroupMembersComponent implements OnInit {

  @Input() members: GroupMember;

  constructor() { }

  ngOnInit(): void {
  }

}
