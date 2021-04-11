import { Injectable } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS, NUM_OF_AJZA, KHITMA_CYCLE_TYPE, KHITMA_GROUP_TYPE, SameTaskKhitmaGroup } from './entities/entities';

import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { map, catchError, take, first } from 'rxjs/operators';
import { environment } from '../environments/environment';

import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { ThrowStmt } from '@angular/compiler';
import { LocalDatabaseService } from './local-database.service';


import * as firebase from 'firebase/app';
import 'firebase/firestore';



@Injectable({
  providedIn: 'root'
})
export class KhitmaGroupService {

  private _currentGroup = new Subject();
  private _currentGroupObj: KhitmaGroup = null;

  private groupsDocs: object = {}; // save references of queried groups

  private _isV2Api = true;

  constructor(private db: AngularFirestore, private localDB: LocalDatabaseService,) { }

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

  public createGroup(title, description, author, groupType?, firstTask?) {

    let newGroupObj = {
      "title": title,
      "description": description || '',
      "author": author,
      "type": groupType,
      "cycle": 0,

    };

    if (groupType === KHITMA_GROUP_TYPE.SAME_TASK) {

      newGroupObj["task"] = firstTask;
      newGroupObj["members"] = {};
      newGroupObj["members"][author] = {
        name: author,
        isTaskDone: false
      }

    }
    else {
      let groupToAdd = new KhitmaGroup({ "title": title, "description": description, "author": author, "type": groupType });
      newGroupObj["ajza"] = groupToAdd.getAjzaObj(); // [todo]: static function to get empty ajza obj

    }

    return this.db.collection('groups').add(newGroupObj);

  }

  public getGroupURL(groupId: string) {
    return location.origin + '/group/' + groupId;
  }

  public isValidGroup(group: KhitmaGroup) {

    return group && group.title ? true : false;
  }


  public updateGroupInfo(groupId, title, description, targetDate, admins) {



    this.db.doc<KhitmaGroup>('groups/' + groupId).update({
      title: title,
      description: description || "",
      targetDate: targetDate || "",
      admins: admins || ""
    });

  }

  public updateJuz(groupId, juzIndex, ownerName, juzStatus) {

    if (!groupId) {
      groupId = this._currentGroupObj.id;
    }

    if (juzIndex == null) {
      return; // [todo]: handle error
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

      let updatedObj = {};
      updatedObj[("ajza." + juzIndex)] = this._currentGroupObj.ajza[juzIndex];

      this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
    }
    else {
      this.db.doc<KhitmaGroup>('groups/' + groupId).update({ "ajza": this._currentGroupObj.ajza });
    }


    // update also in the pesonal khitma
    if (ownerName == this.localDB.getUsername) {
      this.localDB.updateMyPersonalKhitmahJuz(this._currentGroupObj.ajza[juzIndex]);
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




  updateGroupTask(groupId, newTask, currentCycle) {

    this.db.doc<SameTaskKhitmaGroup>('groups/' + groupId).update({ "task": newTask, "cycle": (currentCycle + 1) });
  }


  addGroupMember(groupId, memberName) {

    let updatedObj = {};
    updatedObj[("members." + memberName)] = {
      name: memberName,
      isTaskDone: false
    };

    return this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);

  }

  removeGroupMember(groupId, memberName) {

    let updatedObj = {};
    updatedObj["members"] = {};
    updatedObj["members"][memberName] = firebase.default.firestore.FieldValue.delete();

    return this.db.doc<any>('groups/' + groupId).set(updatedObj, { merge: true });


  }

  updateMemberTask(groupId, memberName, isDone: boolean) {

    let updatedObj = {};
    updatedObj["members." + memberName + ".isTaskDone"] = isDone;

    this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);


  }



}
