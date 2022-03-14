import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CommonService {


  translation: any = { loaded: false }
  missingTranslation: any = { loaded: true }
  languages = [
    { text: "العربية", value: "Ar" },
    { text: "English", value: "En" },
    { text: "Français", value: "Fr" },
    { text: "Espaniol", value: "Es" },
    { text: "Deutsch", value: "De" },
  ]
  constructor(private httpClient: HttpClient) {
    this.loadTranslationFile();
  }


  get currentLanguage() {
    let lng = window.localStorage.getItem('lng');
    if (!lng) {
      lng = 'ar';
    }
    return lng;
  }

  set currentLanguage(value) {
    window.localStorage.setItem('lng', value.toLocaleLowerCase());
    this.translation.loaded = false;
    window.location.reload();
  }

  loadTranslationFile() {
    const lng = this.currentLanguage;
    if (!this.translation.loaded) {
      this.httpClient.get(`assets/translate/${lng}.json`, { responseType: 'json' })
        .subscribe(data => {
          this.translation = data;
          let dir = "rtl";
          if (lng !== "ar") {
            dir = "ltr";
          }
          document.body.classList.remove("rtl", "ltr");
          document.body.classList.add(dir);
        }
        );
    }
  }


}

