import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SharedModule } from '../../modules/shared.module';
import { CommonService } from '../../service/common.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule]
})
export class AboutComponent implements OnInit {

  constructor(public common: CommonService) { }

  ngOnInit(): void {

  }


}
