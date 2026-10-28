import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SharedModule } from '../../modules/shared.module';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule]
})
export class AboutComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {

  }


}
