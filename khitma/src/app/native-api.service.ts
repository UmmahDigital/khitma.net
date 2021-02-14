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
