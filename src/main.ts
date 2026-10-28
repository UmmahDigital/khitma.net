import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { captureLandingRef } from './app/referral';

if (environment.production) {
  enableProdMode();
}

// Before the router reads the address: keep a shared link's reference (?r=) and remove it from the address.
captureLandingRef();

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));

