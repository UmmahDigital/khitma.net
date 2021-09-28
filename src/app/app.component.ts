import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, Event, NavigationStart, NavigationEnd } from '@angular/router';
import { NotificationsService } from './notifications.service';
import { PwaService } from './pwa.service';
import { PopMenuComponent } from './shared/pop-menu/pop-menu.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None

})
export class AppComponent {

  isPwaInstalled = false;
  menuDialogRef;

  isDarkStyle = false;

  unreadNotification = null;

  constructor(public pwa: PwaService, private dialog: MatDialog, private router: Router, private notificationsService: NotificationsService) {

    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isPwaInstalled = true;
    }

    this.router.events.subscribe((event: Event) => {

      if (event instanceof NavigationStart) { // NavigationEnd
        if (this.menuDialogRef) {
          this.menuDialogRef.close();
        }
      }
      else if (event instanceof NavigationEnd) {
        this.isDarkStyle = event.url === "/ramadan";

        // window.scroll(0, 0);

        document.querySelector('#app-content').scrollTo(0, 0);
      }
    });

    this.notificationsService.getUnreadNotification().subscribe(notification => {
      this.unreadNotification = notification
    });

  }

  installPwa(): void {
    if (this.pwa.promptEvent) {
      this.pwa.promptEvent.prompt();
    }
  }

  openMenu() {
    this.menuDialogRef = this.dialog.open(PopMenuComponent, {
      maxWidth: "80%"
    });

  }

  showNotification() {
    this.notificationsService.showNotification(this.unreadNotification);
  }

}
