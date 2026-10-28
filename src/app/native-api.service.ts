import { Injectable } from '@angular/core';
import { GoogleAnalyticsService } from './analytics';

@Injectable({
  providedIn: 'root',
})
export class NativeApiService {
  public isAvailable = false;

  constructor(private analytics: GoogleAnalyticsService) {
    if (navigator.share) {
      this.isAvailable = true;
    }
  }

  /** `content` (invite, status, completion_dua…) and `groupId` describe the share in the `share` analytics event. */
  share(title, text, url, content = 'other', groupId?: string) {
    const method = window['Flutter'] ? 'flutter' : this.isAvailable ? 'native' : 'unavailable';
    this.analytics.send('share', { method, content_type: content, ...(groupId ? { item_id: groupId } : {}) });

    if (window['Flutter']) {
      window['Flutter'].postMessage(
        JSON.stringify({
          title: title,
          text: text,
          url: url,
        })
      );

      return;
    }

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
      url: url,
    });
  }

  //   shareFile(filesArray): void {

  //     const base64url = "data:image/octet-stream;base64,/9j/4AAQSkZ...."
  // const blob = await (await fetch(base64url)).blob();
  // const file = new File([blob], 'fileName.png', { type: blob.type });
  // navigator.share({
  //   title: 'Hello',
  //   text: 'Check out this image!',
  //   files: [file],
  // })

  //     if ((<any>navigator).canShare && (<any>navigator).canShare({ files: filesArray })) {
  //       navigator.share({
  //         files: filesArray,
  //         title: 'Pictures',
  //         text: 'Our Pictures.',
  //       })
  //     }

  //   }
}
