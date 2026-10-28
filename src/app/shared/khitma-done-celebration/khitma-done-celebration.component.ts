import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-khitma-done-celebration',
    templateUrl: './khitma-done-celebration.component.html',
    styleUrls: ['./khitma-done-celebration.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class KhitmaDoneCelebrationComponent implements OnInit {

  isOpen = false;

  constructor() { }

  ngOnInit(): void {
  }

}
