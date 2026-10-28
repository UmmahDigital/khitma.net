import { Injectable } from '@angular/core';
import { User } from '../common/model';

/**
 * Social login was retired. Phones that signed in back then still keep a `login` entry;
 * it is only read (to keep listing those groups and to prefill the creator's name), never written.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {

  get currentUser(): User | undefined {
    const stored = localStorage.getItem("login");
    if (!stored) {
      return undefined;
    }

    try {
      return JSON.parse(stored);
    } catch {
      return undefined;
    }
  }
}
