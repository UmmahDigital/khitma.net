import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PwaService } from './pwa.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class AppComponent {

  isPwaInstalled = false;

  constructor(public pwa: PwaService) {

    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isPwaInstalled = true;
    }

  }

  installPwa(): void {
    if (this.pwa.promptEvent) {
      this.pwa.promptEvent.prompt();
    }
  }

}
