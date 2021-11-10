import { Injectable } from '@angular/core';
import { Juz, KhitmaGroup, KhitmaGroup_Sequential, NUM_OF_AJZA } from './entities/entities';

@Injectable({
  providedIn: 'root'
})
export class LocalDatabaseService {

  groups: object; // Record<string,Juz>; // groups = active gorups  // [todo]: watch and save() upon change?
  archivedGroups: object; // [todo]: watch and save() upon change?

  personalKhitma: object;
  myGlobalKhitmaAjza;

  lastRecievedNotificationId = "";

  constructor() {

    this.groups = JSON.parse(localStorage.getItem("groups")) || {};

    this.archivedGroups = JSON.parse(localStorage.getItem("archivedGroups")) || {};

    this.personalKhitma = JSON.parse(localStorage.getItem("personalKhitma")) || null;

    this.myGlobalKhitmaAjza = JSON.parse(localStorage.getItem("myGlobalKhitmaAjza")) || null;

    this.lastRecievedNotificationId = localStorage.getItem("lastRecievedNotificationId") || null;

    if (!this.personalKhitma) {
      this._initPersonalKhitma();
    }

    if (!this.myGlobalKhitmaAjza) {
      this._initMyGlobalKhitmaAjza();
    }

  }

  private _initPersonalKhitma() {
    let ajza = KhitmaGroup_Sequential.getEmptyAjzaArray();
    this.updateMyPersonalKhitmah(ajza);
  }

  private _initMyGlobalKhitmaAjza() {

    let ajza = [];

    for (let i = 0; i < NUM_OF_AJZA; i++) {
      ajza.push(false);
    }

    this.updateGlobalKhitmaAjza(ajza);
  }

  private _byDateSorter(a, b) {
    return a.joinTimestamp - b.joinTimestamp;

  }



  private _save() {
    localStorage.setItem("groups", JSON.stringify(this.groups));
    localStorage.setItem("archivedGroups", JSON.stringify(this.archivedGroups));

  }

  // setUsername(groupId, name) {

  //   if (!this.groups[groupId]) {
  //     return;
  //   }

  //   this.groups[groupId].userName = name
  //   this._save();
  // }

  getUsername(groupId) {
    return this.groups[groupId].username.trim();
  }

  joinGroup(groupId, username) {

    this.groups[groupId] = {
      isJoined: true,
      username: username.trim(),
      joinTimestamp: Date.now()
    };

    this._save();
  }

  isGroupJoined(groupId) {
    return (this.groups[groupId] != null) && this.groups[groupId].isJoined;
  }

  getGroups() {
    return this.groups;
  }

  getMyKhitmaCycle(groupId) {
    return this.groups[groupId].cycle;
  }

  getMyGroups() {
    return Object.keys(this.groups).sort(this._byDateSorter);
  }

  archiveGroup(group: KhitmaGroup) {

    this.archivedGroups[group.id] = {
      id: group.id,
      title: group.title,
      joinTimestamp: this.groups[group.id].joinTimestamp,
      archivedTimeStamp: Date.now()
    }

    delete this.groups[group.id];

    this._save();
  }

  // removeGroup(groupId) {
  //   delete this.archivedGroups[groupId];
  //   this._save();
  // }


  clearArchive() {
    this.archivedGroups = {};
    this._save();
  }




  getArchivedGroups() {
    return Object.values(this.archivedGroups).sort(this._byDateSorter);
  }

  hasArchive() {
    return Object.keys(this.archivedGroups).length > 0
  }




  getMyPersonalKhitmah() {
    return this.personalKhitma;

  }

  updateMyPersonalKhitmah(personalKhitmaAjza) {
    this.personalKhitma = personalKhitmaAjza;
    localStorage.setItem("personalKhitma", JSON.stringify(this.personalKhitma));
  }

  updateMyPersonalKhitmahJuz(juz) {

    if (!this.personalKhitma) {
      return;
    }


    this.personalKhitma[juz.index].status = juz.status;
    localStorage.setItem("personalKhitma", JSON.stringify(this.personalKhitma));
  }


  // ** Global Khitma

  getMyGlobalKhitmaAjza() {
    return this.myGlobalKhitmaAjza;
  }

  resetMyGlobalKhitmaAjza() {
    this._initMyGlobalKhitmaAjza();
  }

  updateGlobalKhitmaAjza(ajza) {
    this.myGlobalKhitmaAjza = ajza;
    localStorage.setItem("myGlobalKhitmaAjza", JSON.stringify(this.myGlobalKhitmaAjza));
  }

  updateGlobalKhitmaJuz(juzIndex, isDone) {

    this.myGlobalKhitmaAjza[juzIndex] = isDone;
    this.updateGlobalKhitmaAjza(this.myGlobalKhitmaAjza);

  }

  setLastRecievedNotificationId(id: string) {
    this.lastRecievedNotificationId = id;
    localStorage.setItem("lastRecievedNotificationId", id);
  }

  getLastRecievedNotificationId() {
    return this.lastRecievedNotificationId;
  }


  // Aqsa Khitma

  getMyAqsaKhitmaPages() {
    let pagesStr = localStorage.getItem("aqsaKhitmaPages") || null;

    if (!pagesStr) {
      return null;
    }

    let tmp = pagesStr.split("-");

    return {
      from: tmp[0],
      to: tmp[1]
    }
  }


  setMyAqsaKhitmaPages(pages) {

    if (!pages) {
      localStorage.removeItem("aqsaKhitmaPages");
      return;
    }

    localStorage.setItem("aqsaKhitmaPages", pages.from + "-" + pages.to);
  }

}
