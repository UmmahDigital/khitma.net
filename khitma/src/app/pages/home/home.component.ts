import { Component, OnInit } from '@angular/core';
import { KhitmaGroupService } from '../../khitma-group.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  // constructor(private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {
  }

}
