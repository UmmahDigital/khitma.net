import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-get',
  templateUrl: './get.component.html',
  styleUrls: ['./get.component.scss']
})
export class GetComponent implements OnInit {

  constructor() { }



  private getRedirectionURL() {

    const APP_URLS = {

      IOS: "https://apps.apple.com/us/app/%D8%AE%D8%AA%D9%85%D8%A9-%D9%86%D8%AA/id1557122268",
      ANDROID: "https://play.google.com/store/apps/details?id=digital.ummah.khitma",
      WEB: "https://khitma.net",
    };

    if (navigator.userAgent.toLowerCase().includes("iphone")) {
      return APP_URLS.IOS;
    }

    if (navigator.userAgent.toLowerCase().includes("android")) {
      return APP_URLS.ANDROID;
    }

    return APP_URLS.WEB;
  }

  ngOnInit(): void {

    window.location.href = this.getRedirectionURL();

  }

}
