import { Injectable } from '@angular/core';
import { KhitmaGroup, Juz } from './entities/entities';

import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { environment } from '../environments/environment';

import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class KhitmaGroupService {

  public currentGroup = new BehaviorSubject(null);


  private groupsDocs: object = {}; // save references of queried groups

  constructor(private db: AngularFirestore) { }

  public getGroupDetails(groupId: string): Observable<KhitmaGroup> {

    this.groupsDocs[groupId] = this.db.doc<KhitmaGroup>('groups/' + groupId);
    return this.groupsDocs[groupId].valueChanges({ idField: 'id' });
  }

  public updateGroup(groupId: string, updatedGroup: KhitmaGroup) {
    return this.groupsDocs[groupId].update(KhitmaGroup);
  }

  public createGroup(title, description, author) {

    const groupToAdd = new KhitmaGroup({ "title": title, "description": description, "author": author });

    return this.db.collection('groups').add({
      "title": groupToAdd.title,
      "description": groupToAdd.description || '',
      "author": groupToAdd.author,
      "ajza": groupToAdd.getAjzaObj()
    });

    // .then(docRef => {
    //   console.log("Document written with ID: ", docRef.id);
    // });

  }

  public getGroupURL(groupId: string) {
    return location.origin + '/group/' + groupId;
  }

  public isValidGroup(group: KhitmaGroup) {
    return group.title ? true : false;
  }
}
