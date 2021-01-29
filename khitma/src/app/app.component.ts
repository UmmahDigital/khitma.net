import { Component, ViewEncapsulation } from '@angular/core';
import { PwaService } from './pwa.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class AppComponent {

  constructor(public pwa: PwaService) { }

  installPwa(): void {
    this.pwa.promptEvent.prompt();
  }

}
