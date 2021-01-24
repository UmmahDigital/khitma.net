import { Component, OnInit, Input } from '@angular/core';

import { Juz } from '../../entities/entities';

@Component({
  selector: 'app-juz-list',
  templateUrl: './juz-list.component.html',
  styleUrls: ['./juz-list.component.scss']
})
export class JuzListComponent implements OnInit {

  @Input() ajza: Juz[];

  constructor() { }

  ngOnInit(): void {
    console.log(this.ajza);
  }

}
