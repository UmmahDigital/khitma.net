import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-khitma-progress',
  templateUrl: './khitma-progress.component.html',
  styleUrls: ['./khitma-progress.component.scss']
})
export class KhitmaProgressComponent implements OnInit {

  @Input() target: number;
  @Input() current: number;


  percent: number;

  constructor() { }

  ngOnInit(): void {

    let currentPercent = Math.round(this.current / this.target * 100);

    this.percent = 0;

    let interval = setInterval(() => {
      this.percent++;

      if (this.percent == currentPercent) {
        clearInterval(interval);
      }
    }, 60);

  }
}
