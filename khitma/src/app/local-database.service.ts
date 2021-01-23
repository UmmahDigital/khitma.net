import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalDatabaseService {

  constructor() { }

  setUserName(name) {
    localStorage.setItem('username', name);
  }

  getUserName() {
    localStorage.getItem('username');
  }

  insertGroup(groupId) {

  }

  deleteGroup(groupId) {

  }




}
