import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-khitma-progress',
  templateUrl: './khitma-progress.component.html',
  styleUrls: ['./khitma-progress.component.scss']
})
export class KhitmaProgressComponent implements OnInit {

  @Input() target: number;
  @Input() current: number;


  percent: number = 0;



  constructor() { }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges) {

    setTimeout(() => {
      this.percent = Math.round(this.current / this.target * 100);

    }, 0);

  }


}
