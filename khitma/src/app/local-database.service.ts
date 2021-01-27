import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalDatabaseService {

  groups: object; // [todo]: watch and save() upon change?

  constructor() {
    this.groups = JSON.parse(localStorage.getItem("groups")) || {};
  }

  private _save() {
    localStorage.setItem("groups", JSON.stringify(this.groups));

  }

  // setUsername(groupId, name) {

  //   if (!this.groups[groupId]) {
  //     return;
  //   }

  //   this.groups[groupId].userName = name
  //   this._save();
  // }

  getUsername(groupId) {
    return this.groups[groupId].username;
  }

  joinGroup(groupId, username) {

    this.groups[groupId] = {
      isJoined: true,
      username: username
    };

    this._save();
  }

  isGroupJoined(groupId) {
    return (this.groups[groupId] && this.groups[groupId].isJoined);
  }

  getGroups() {
    return this.groups;
  }


  deleteGroup(groupId) {

  }

  getMyJuz(groupId) {
    return this.groups[groupId].juzIndex;
  }

  setMyJuz(groupId, juzIndex) {

    if (!this.groups[groupId]) {
      return;
    }

    this.groups[groupId].juzIndex = juzIndex;
    this._save();
  }


  getMyGroups() {
    return Object.keys(this.groups);
  }



}
