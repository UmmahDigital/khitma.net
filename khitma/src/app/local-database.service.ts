import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalDatabaseService {

  groups: string[];

  constructor() {
    this.groups = JSON.parse(localStorage.getItem("groups")) || [];
  }

  setUserName(name) {
    localStorage.setItem('username', name);
  }

  getUserName() {
    localStorage.getItem('username');
  }

  insertGroup(groupId) {
    this.groups.push(groupId);
    localStorage.setItem("names", JSON.stringify(this.groups));
  }

  isGroupExist(groupId) {
    return this.groups.includes(groupId);
  }

  getGroups() {
    return this.groups;
  }


  deleteGroup(groupId) {

  }




}
