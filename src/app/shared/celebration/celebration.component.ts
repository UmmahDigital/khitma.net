import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-celebration',
    templateUrl: './celebration.component.html',
    styleUrls: ['./celebration.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CelebrationComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
