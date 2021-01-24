import { Component, Input, OnInit } from '@angular/core';
import { Juz } from 'src/app/entities/entities';

@Component({
  selector: 'app-juz',
  templateUrl: './juz.component.html',
  styleUrls: ['./juz.component.scss']
})
export class JuzComponent implements OnInit {

  @Input() juz: Juz;

  constructor() { }

  ngOnInit(): void {
  }

}
