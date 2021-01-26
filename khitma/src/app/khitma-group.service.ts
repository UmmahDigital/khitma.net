import { Injectable } from '@angular/core';
import { KhitmaGroup, Juz, JUZ_STATUS } from './entities/entities';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, take, first } from 'rxjs/operators';
import { environment } from '../environments/environment';

import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class KhitmaGroupService {

  private _currentGroup = new BehaviorSubject(null);
  private _currentGroupObj: KhitmaGroup = null;

  private groupsDocs: object = {}; // save references of queried groups

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

    this.groupsDocs[groupId] = this.db.doc<KhitmaGroup>('groups/' + groupId);

    this.groupsDocs[groupId].valueChanges({ idField: 'id' }).subscribe((group: KhitmaGroup) => {

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
      "ajza": groupToAdd.getAjzaObj()
    });

  }

  public getGroupURL(groupId: string) {
    return location.origin + '/group/' + groupId;
  }

  public isValidGroup(group: KhitmaGroup) {

    return group && group.title ? true : false;
  }

  public updateJuz(groupId, juzIndex, ownerName, juzStatus) {

    if (!groupId) {
      groupId = this._currentGroupObj.id;
    }

    // [todo]: might need to change code below when supporting multigroup

    // [todo]: might have to switch to object instead of array for Ajza

    this._currentGroupObj.ajza[juzIndex] = {
      index: juzIndex,
      status: juzStatus,
      owner: ownerName
    };

    if (juzStatus == JUZ_STATUS.IDLE) {
      this._currentGroupObj.ajza[juzIndex].owner = "";
    }

    this.db.doc<KhitmaGroup>('groups/' + groupId).update({ ajza: this._currentGroupObj.ajza });

  }

  getGroups(groupsIds: string[]) {
    return this.db.collection('groups', ref => ref.where('__name__', 'in', groupsIds)).valueChanges({ idField: 'id' });
  }

}
