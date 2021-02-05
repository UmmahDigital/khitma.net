import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NativeApiService {

  public isAvailable = false;

  constructor() {
    if (navigator.share) {
      this.isAvailable = true;
    }
  }


  share(title, text, url) {

    if (!this.isAvailable) {
      return;
    }

    if (!url) {
      return navigator.share({
        title: title,
        text: text,
      });
    }

    return navigator.share({
      title: title,
      text: text,
      url: url
    });

  }
}
