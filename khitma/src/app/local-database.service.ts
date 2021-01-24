import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalDatabaseService {

  groups: object;

  constructor() {
    this.groups = JSON.parse(localStorage.getItem("groups")) || {};
  }

  setUserName(name) {
    localStorage.setItem('username', name);
  }

  getUserName() {
    localStorage.getItem('username');
  }

  insertGroup(groupId) {
    this.groups[groupId] = 'joined';
    localStorage.setItem("groups", JSON.stringify(this.groups));
  }

  isGroupJoined(groupId) {
    return (this.groups[groupId] != null);
  }

  getGroups() {
    return this.groups;
  }


  deleteGroup(groupId) {

  }




}
