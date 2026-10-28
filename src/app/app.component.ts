import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { Router, Event, NavigationStart, NavigationEnd } from '@angular/router';
import { CelebrationService } from './celebration.service';
import { NotificationsService } from './notifications.service';
import { PwaService } from './pwa.service';
import { CommonService } from './service/common.service';
import { SeoService } from './seo.service';
import { PopMenuComponent } from './shared/pop-menu/pop-menu.component';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AppComponent {

  isPwaInstalled = false;
  menuDialogRef;

  isDarkStyle = false;

  unreadNotification = null;

  showCelebration = false;
  showLang = false;

  constructor(public pwa: PwaService, private dialog: MatDialog, private router: Router,
    private notificationsService: NotificationsService,
    private celebrationService: CelebrationService, public common: CommonService,
    iconRegistry: MatIconRegistry, private seo: SeoService) {

    // Outlined icons from a small self-hosted font (styles.scss), in the lighter line style.
    iconRegistry.setDefaultFontSetClass('material-symbols-outlined', 'mat-ligature-font');

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
        this.seo.update(event.urlAfterRedirects);

        // window.scroll(0, 0);

        document.querySelector('#app-content').scrollTo(0, 0);
      }
    });

    this.notificationsService.getUnreadNotification().subscribe(notification => {
      this.unreadNotification = notification
    });


    this.celebrationService.newCelebration().subscribe(() => {
      this.celebrate();
    });

  }

  celebrate() {
    this.showCelebration = true;

    setTimeout(() => {
      this.showCelebration = false;
    }, 5000);
  }

  installPwa(): void {
    if (this.pwa.promptEvent) {
      this.pwa.promptEvent.prompt();
    }
  }

  openMenu() {
    this.menuDialogRef = this.dialog.open(PopMenuComponent, {
      maxWidth: "80vw"
    });

  }

  showNotification() {
    this.notificationsService.showNotification(this.unreadNotification);
  }

  changeLanguage(value) {
    this.common.currentLanguage = value;
  }

}
