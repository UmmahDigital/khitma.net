import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core';
import { KhitmaGroup, KHITMA_GROUP_TYPE } from 'src/app/entities/entities';
import { KhitmaGroupService } from 'src/app/khitma-group.service';


@Component({
  selector: 'app-khitma-info',
  templateUrl: './khitma-info.component.html',
  styleUrls: ['./khitma-info.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class KhitmaInfoComponent implements OnInit {

  @Input() group: KhitmaGroup;
  @Input() showLink?: boolean;
  @Input() isExpanded?: boolean;

  groupLink: string;
  KHITMA_GROUP_TYPE = KHITMA_GROUP_TYPE;

  constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {

    if (this.showLink) {
      this.groupLink = this.groupsApi.getGroupURL(this.group.id);
    }
  }



}
