import { Component, OnInit, Input } from '@angular/core';
import { KhitmaGroup } from 'src/app/entities/entities';
import { KhitmaGroupService } from 'src/app/khitma-group.service';


@Component({
  selector: 'app-khitma-info',
  templateUrl: './khitma-info.component.html',
  styleUrls: ['./khitma-info.component.scss']
})
export class KhitmaInfoComponent implements OnInit {

  @Input() group: KhitmaGroup;
  @Input() showLink?: KhitmaGroup;

  groupLink: string;

  constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {

    if (this.showLink) {
      this.groupLink = this.groupsApi.getGroupURL(this.group.id);
    }
  }



}
