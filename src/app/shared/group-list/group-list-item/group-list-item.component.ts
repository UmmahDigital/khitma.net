import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { KhitmaGroupService } from '../../../../app/khitma-group.service';
import { progressCounts } from '../../ajza-progress/ajza-progress.component';

@Component({
    selector: 'app-group-list-item',
    templateUrl: './group-list-item.component.html',
    styleUrls: ['./group-list-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class GroupListItemComponent implements OnInit {

  @Input() group;

  link;

  progress;

  constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {
    this.progress = progressCounts(this.group);
    this.link = this.groupsApi.getGroupURL(this.group.id);
  }
}
