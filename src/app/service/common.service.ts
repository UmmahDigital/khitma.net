import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { appLanguage, isRtl, LANGUAGES } from '../languages';

@Injectable({
  providedIn: 'root'
})
export class CommonService {


  translation: any = { loaded: false }
  missingTranslation: any = { loaded: true }
  languages = LANGUAGES.map((language) => ({ text: language.name, value: language.code }));
  constructor(private httpClient: HttpClient) {
    this.loadTranslationFile();
  }


  get currentLanguage() {
    return appLanguage();
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
          const dir = isRtl(lng) ? "rtl" : "ltr";
          document.body.classList.remove("rtl", "ltr");
          document.body.classList.add(dir);
        }
        );
    }
  }


}

