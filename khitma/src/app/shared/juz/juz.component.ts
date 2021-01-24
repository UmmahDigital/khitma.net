import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Juz, JUZ_STATUS } from 'src/app/entities/entities';

@Component({
  selector: 'app-juz',
  templateUrl: './juz.component.html',
  styleUrls: ['./juz.component.scss']
})
export class JuzComponent implements OnInit {

  @Input() juz: Juz;

  stateClass: string;

  constructor() { }

  ngOnInit(): void {

    switch (this.juz.status) {
      case JUZ_STATUS.IDLE: this.stateClass = "idle"; break;
      case JUZ_STATUS.BOOKED: this.stateClass = "booked"; break;
      case JUZ_STATUS.DONE: this.stateClass = "done"; break;
    }


  }

}
