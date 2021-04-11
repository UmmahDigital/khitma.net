import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-global-khitma',
  templateUrl: './global-khitma.component.html',
  styleUrls: ['./global-khitma.component.scss'],
  // encapsulation: ViewEncapsulation.None

})
export class GlobalKhitmaComponent implements OnInit {

  constructor() { }

  day = 10;

  ngOnInit(): void {
  }

}
