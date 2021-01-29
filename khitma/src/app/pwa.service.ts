import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';


@Injectable({
  providedIn: 'root'
})
export class PwaService {

  promptEvent;

  constructor(private swUpdate: SwUpdate) {

    window.addEventListener('beforeinstallprompt', event => {
      this.promptEvent = event;
    });


    swUpdate.available.subscribe(event => {
      // if (askUserToUpdate()) {
      window.location.reload();
      // }
    });
  }
}
