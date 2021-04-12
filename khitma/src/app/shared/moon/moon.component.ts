import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-moon',
  templateUrl: './moon.component.html',
  styleUrls: ['./moon.component.scss']
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

    this.days = this.days;
    let time = ((this.days * 1000) / 2) % 15000;

    setTimeout(() => {
      this.animationState = "paused";

    }, time);
  }

}
