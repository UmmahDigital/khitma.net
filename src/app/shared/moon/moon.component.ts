import { Component, Input, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-moon',
    templateUrl: './moon.component.html',
    styleUrls: ['./moon.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MoonComponent implements OnInit {

  @Input() days: number;

  animationState = "running";

  constructor() { }

  ngOnInit(): void {

    if (this.days <= 0) {
      this.animationState = "paused";
      return;
    }


    this.animate();


  }

  animate() {

    this.days = this.days;
    let time = ((this.days * 1000) / 2) % 15000;

    this.animationState = "running";

    setTimeout(() => {
      this.animationState = "paused";

    }, time);
  }


  ngOnChanges(changes: SimpleChanges) {
    if (changes['days']) {
      this.animate();
    }
  }

}
