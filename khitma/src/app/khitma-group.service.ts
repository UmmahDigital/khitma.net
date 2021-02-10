import { Injectable } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS, NUM_OF_AJZA, KHITMA_CYCLE_TYPE } from './entities/entities';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, take, first } from 'rxjs/operators';
import { environment } from '../environments/environment';

import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { ThrowStmt } from '@angular/compiler';




@Injectable({
  providedIn: 'root'
})
export class KhitmaGroupService {

  private _currentGroup = new BehaviorSubject(null);
  private _currentGroupObj: KhitmaGroup = null;

  private groupsDocs: object = {}; // save references of queried groups

  private _isV2Api = true;

  constructor(private db: AngularFirestore) { }

  public getGroupDetailsOnce(groupId: string): Observable<KhitmaGroup> {
    this.groupsDocs[groupId] = this.db.doc<KhitmaGroup>('groups/' + groupId);
    return this.groupsDocs[groupId].get().pipe(map(res => {
      const data = (<any>res).data();
      const id = (<any>res).id;
      return { id, ...data };
    }));
  }

  public setCurrentGroup(groupId: string) {

    this.groupsDocs[groupId] = this.db.doc<any>('groups/' + groupId); // any should be `KhitmaGroup` after change stabilyzes 

    this.groupsDocs[groupId].valueChanges({ idField: 'id' }).subscribe((group: any) => {

      this._isV2Api = !Array.isArray(group.ajza);

      if (this._isV2Api) {
        group.ajza = KhitmaGroup.convertAjzaToArray(group.ajza);
      }

      this._currentGroupObj = group;
      this._currentGroup.next(this._currentGroupObj);

    });

    return this.getGroupDetailsOnce(groupId);

  }




  public getCurrentGroup() {
    return this._currentGroup;
  }

  public getCurrentGroupId() {
    return this._currentGroupObj.id;
  }

  // public updateGroup(groupId: string, updatedGroup: KhitmaGroup) {
  //   return this.groupsDocs[groupId].update(KhitmaGroup);
  // }

  public createGroup(title, description, author) {

    const groupToAdd = new KhitmaGroup({ "title": title, "description": description, "author": author });

    return this.db.collection('groups').add({
      "title": groupToAdd.title,
      "description": groupToAdd.description || '',
      "author": groupToAdd.author,
      "cycle": 0,
      "ajza": groupToAdd.getAjzaObj()
    });

  }

  public getGroupURL(groupId: string) {
    return location.origin + '/group/' + groupId;
  }

  public isValidGroup(group: KhitmaGroup) {

    return group && group.title ? true : false;
  }


  public updateGroupInfo(groupId, title, description) {

    this.db.doc<KhitmaGroup>('groups/' + groupId).update({
      title: title,
      description: description || ""
    });

  }

  public updateJuz(groupId, juzIndex, ownerName, juzStatus) {

    if (!groupId) {
      groupId = this._currentGroupObj.id;
    }

    // [todo]: might need to change code below when supporting multigroup

    this._currentGroupObj.ajza[juzIndex] = {
      index: juzIndex,
      status: juzStatus,
      owner: ownerName || ""
    };

    if (juzStatus == JUZ_STATUS.IDLE) {
      this._currentGroupObj.ajza[juzIndex].owner = "";
    }

    if (this._isV2Api) {

      const updatedObj = {};
      updatedObj[("ajza." + juzIndex)] = this._currentGroupObj.ajza[juzIndex];

      this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
    }
    else {
      this.db.doc<KhitmaGroup>('groups/' + groupId).update({ "ajza": this._currentGroupObj.ajza });
    }
  }

  getGroups(groupsIds: string[]) {
    return this.db.collection('groups', ref => ref.where('__name__', 'in', groupsIds)).valueChanges({ idField: 'id' });
  }

  startNewKhitmah(newCycle, newCycleType) {

    function _generateNextCycleAjza(oldCycleAjza: Juz[]): Juz[] {

      let newCycleAjza: Juz[] = [];

      newCycleAjza.push(new Juz({
        index: 0,
        owner: oldCycleAjza[NUM_OF_AJZA - 1].owner,
        status: JUZ_STATUS.BOOKED
      }));

      for (let i = 1; i < NUM_OF_AJZA; i++) {

        newCycleAjza.push(new Juz({
          index: i,
          owner: oldCycleAjza[i - 1].owner,
          status: JUZ_STATUS.BOOKED
        }));

      }

      return newCycleAjza;
    }

    function _keepOnlyLastJuz(newCycleAjza: Juz[]): Juz[] { // for example if someone read juz 25-30 in the last cycle. next time she should read 1 (without 26-30).

      for (let i = NUM_OF_AJZA - 1; i > 0; i--) { // special case for juz 1, as 1 comes after 30
        if (newCycleAjza[i].owner == newCycleAjza[0].owner) {
          newCycleAjza[i] = {
            index: newCycleAjza[i].index,
            owner: "",
            status: JUZ_STATUS.IDLE
          };
        }
      }

      for (let i = NUM_OF_AJZA - 1; i > 0; i--) {
        if (newCycleAjza[i].owner != "") {
          for (let j = 1; j < i; j++) {
            if (newCycleAjza[j].owner == newCycleAjza[i].owner) {
              newCycleAjza[j] = {
                index: newCycleAjza[j].index,
                owner: "",
                status: JUZ_STATUS.IDLE
              };
            }
          }
        }
      }

      return newCycleAjza;

    }


    let ajzaObj = {};

    if (newCycleType == KHITMA_CYCLE_TYPE.AUTO_BOOK) {

      let ajza = _generateNextCycleAjza(this._currentGroupObj.ajza);
      let ajzaWithoutDuplicates = _keepOnlyLastJuz(ajza);

      ajzaObj = KhitmaGroup.convertAjzaToObj(ajzaWithoutDuplicates);

    }
    else {
      ajzaObj = KhitmaGroup.getEmptyAjzaObj();
    }

    this.db.doc<any>('groups/' + this._currentGroupObj.id).update({ "cycle": newCycle, "ajza": ajzaObj });

  }

}
