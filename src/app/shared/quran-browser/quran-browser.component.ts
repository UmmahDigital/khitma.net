import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-quran-browser',
    templateUrl: './quran-browser.component.html',
    styleUrls: ['./quran-browser.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class QuranBrowserComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
