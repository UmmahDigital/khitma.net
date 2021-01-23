import { Component, OnInit, Input } from '@angular/core';
import { KhitmaGroup } from 'src/app/entities/entities';


@Component({
  selector: 'app-khitma-info',
  templateUrl: './khitma-info.component.html',
  styleUrls: ['./khitma-info.component.scss']
})
export class KhitmaInfoComponent implements OnInit {

  @Input() group: KhitmaGroup;



  constructor() { }

  ngOnInit(): void {

  }



}
