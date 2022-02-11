import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  currentLanguage: string;
  translation: any = { loaded: false }
  missingTranslation: any = { loaded: true }

  constructor(private httpClient: HttpClient) {
    this.loadTranslationFile();
  }




  loadTranslationFile() {
    this.currentLanguage = window.localStorage.getItem('lng');
    if (!this.currentLanguage) {
      this.currentLanguage = 'ar';
    }
    if (!this.translation.loaded) {
      this.httpClient.get(`assets/translate/${this.currentLanguage}.json`, { responseType: 'json' })
        .subscribe(data => {
          this.translation = data;
          console.log('loaded');

        }
        );
    }
  }
}

