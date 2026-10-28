import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-glass-button',
    templateUrl: './glass-button.component.html',
    styleUrls: ['./glass-button.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class GlassButtonComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
