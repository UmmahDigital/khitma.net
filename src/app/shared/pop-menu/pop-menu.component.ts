import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { GoogleAnalyticsService } from '../../analytics';
import { CommonService } from '../../service/common.service';
import { currentTextSize, setTextSize, stepTextSize, TextSize } from '../../text-size';

@Component({
    selector: 'app-pop-menu',
    templateUrl: './pop-menu.component.html',
    styleUrls: ['./pop-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PopMenuComponent implements OnInit {

  textSize: TextSize = currentTextSize();

  constructor(public dialogRef: MatDialogRef<PopMenuComponent>, public common: CommonService,
    private analytics: GoogleAnalyticsService) { }

  ngOnInit(): void {
  }

  changeTextSize(step: -1 | 1): void {
    this.textSize = stepTextSize(this.textSize, step);
    setTextSize(this.textSize);
    this.analytics.send('text_size_changed', { text_size: this.textSize });
  }

}
