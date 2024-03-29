import { Injectable } from '@angular/core';
import {
  KhitmaGroup,
  Juz,
  JUZ_STATUS,
  NUM_OF_AJZA,
  KHITMA_CYCLE_TYPE,
  KHITMA_GROUP_TYPE,
  KhitmaGroup_SameTask,
  KhitmaGroup_Sequential,
} from './entities/entities';

import {
  BehaviorSubject,
  forkJoin,
  Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { map, catchError, take, first } from 'rxjs/operators';
import { environment } from '../environments/environment';

import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
// import { ThrowStmt } from '@angular/compiler';
import { LocalDatabaseService } from './local-database.service';

import * as firebase from 'firebase/compat/app';
import { User } from './common/model';
import { UserService } from './service/user.service';
// import undefined from 'firebase/compat/firestore';

@Injectable({
  providedIn: 'root',
})
export class KhitmaGroupService {
  private _currentGroup = new Subject();
  private _currentGroupObj: KhitmaGroup = null;

  private groupsDocs: object = {}; // save references of queried groups

  private _isV2Api = true;

  constructor(
    private db: AngularFirestore,
    private localDB: LocalDatabaseService,
    private svcUser: UserService
  ) {}

  public getGroupDetailsOnce(groupId: string): Observable<KhitmaGroup> {
    this.groupsDocs[groupId] = this.db.doc<KhitmaGroup>('groups/' + groupId);
    return this.groupsDocs[groupId].get().pipe(
      map((res) => {
        const data = (<any>res).data();
        const id = (<any>res).id;
        return { id, ...data };
      })
    );
  }

  public setCurrentGroup(groupId: string) {
    this.groupsDocs[groupId] = this.db.doc<any>('groups/' + groupId); // any should be `KhitmaGroup` after change stabilyzes

    this.groupsDocs[groupId]
      .valueChanges({ idField: 'id' })
      .subscribe((group: any) => {
        this._isV2Api = !Array.isArray(group.ajza);

        if (this._isV2Api) {
          group.ajza = KhitmaGroup_Sequential.convertAjzaToArray(group.ajza);
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

  public createGroup(title, description, author, groupType?, firstTask?) {
    return this.createGroupForUser(
      title,
      description,
      author,
      null,
      groupType,
      firstTask
    );
  }

  public createGroupForUser(
    title,
    description,
    author,
    authorId?,
    groupType?,
    firstTask?
  ) {
    author = author.trim();

    let newGroupObj = {
      title: title,
      description: description || '',
      author: author,
      type: groupType,
      cycle: 0,
      authorId: authorId || '',
    };

    switch (groupType) {
      case KHITMA_GROUP_TYPE.SAME_TASK: {
        newGroupObj['task'] = firstTask;
        newGroupObj['members'] = {};
        newGroupObj['members'][author] = {
          // name: author,
          isTaskDone: false,
        };
        break;
      }

      case KHITMA_GROUP_TYPE.SEQUENTIAL: {
        newGroupObj['ajza'] = KhitmaGroup_Sequential.getEmptyAjzaObj(); // [todo]: static function to get empty ajza obj
        break;
      }

      case KHITMA_GROUP_TYPE.PAGES_DISTRIBUTION: {
        newGroupObj['members'] = {};
        newGroupObj['members'][author] = {
          // name: author,
          isTaskDone: false,
        };
        break;
      }
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
      description: description || '',
      targetDate: targetDate || '',
      admins: admins || '',
    });
  }

  // ******** SEQUENTIAL KHITMA

  updateJuz(groupId, juzIndex, ownerName, juzStatus) {
    let currentSequentialKhitma = <KhitmaGroup_Sequential>this._currentGroupObj;

    if (!groupId) {
      groupId = this._currentGroupObj.id;
    }

    if (juzIndex == null) {
      return; // [todo]: handle error
    }

    // [todo]: might need to change code below when supporting multigroup

    currentSequentialKhitma.ajza[juzIndex] = {
      index: juzIndex,
      status: juzStatus,
      owner: ownerName || '',
    };

    if (juzStatus == JUZ_STATUS.IDLE) {
      currentSequentialKhitma.ajza[juzIndex].owner = '';
    }

    if (this._isV2Api) {
      let updatedObj = {};
      updatedObj['ajza.' + juzIndex] = currentSequentialKhitma.ajza[juzIndex];

      this.db
        .doc<KhitmaGroup_Sequential>('groups/' + groupId)
        .update(updatedObj);
    } else {
      // LEGACY CODE
      this.db
        .doc<KhitmaGroup_Sequential>('groups/' + groupId)
        .update({ ajza: currentSequentialKhitma.ajza });
    }

    // update also in the pesonal khitma
    if (ownerName == this.localDB.getUsername(groupId)) {
      this.localDB.updateMyPersonalKhitmahJuz(
        currentSequentialKhitma.ajza[juzIndex]
      );
    }

    if (juzStatus == JUZ_STATUS.DONE) {
      this.globalKhitmaUpdateJuzFromGroup('ramadan2021', true);
    }
  }

  getGroups(groupsIds: string[], authorId?: string) {
    let groups$ = [];

    groupsIds.forEach((groupId) => {
      groups$.push(this.getGroupDetailsOnce(groupId));
    });

    if (authorId) {
      const user = this.svcUser.currentUser;
      if (user) {
        user.groupIds.forEach((group) => {
          if (!groups$.includes(group)) {
            groups$.push(group);
          }
        });
      }
    }
    return forkJoin(groups$);

    // return this.db.collection('groups', ref => ref.where('__name__', 'in', groupsIds)).valueChanges({ idField: 'id' });
  }

  startNewSequentialKhitmaCycle(newCycle, newCycleType) {
    function _generateNextCycleAjza(oldCycleAjza: Juz[]): Juz[] {
      let newCycleAjza: Juz[] = [];

      for (let i = 0; i < NUM_OF_AJZA; i++) {
        let prevIndex = i == 0 ? NUM_OF_AJZA - 1 : i - 1;

        newCycleAjza.push(
          new Juz({
            index: i,
            owner: oldCycleAjza[prevIndex].owner || '',
            status:
              oldCycleAjza[prevIndex].status == JUZ_STATUS.IDLE
                ? JUZ_STATUS.IDLE
                : JUZ_STATUS.BOOKED,
          })
        );
      }

      return newCycleAjza;
    }

    function _generateNextCycleAjzaForDoneOnly(oldCycleAjza: Juz[]): Juz[] {
      let newCycleAjza: Juz[] = [];

      for (let i = 0; i < NUM_OF_AJZA; i++) {
        let prevIndex = i == 0 ? NUM_OF_AJZA - 1 : i - 1;

        if (oldCycleAjza[prevIndex].status != JUZ_STATUS.DONE) {
          newCycleAjza.push(
            new Juz({
              index: i,
              owner: '',
              status: JUZ_STATUS.IDLE,
            })
          );
        } else {
          newCycleAjza.push(
            new Juz({
              index: i,
              owner: oldCycleAjza[prevIndex].owner,
              status: JUZ_STATUS.BOOKED,
            })
          );
        }
      }

      return newCycleAjza;
    }

    // function _keepOnlyLastJuz(newCycleAjza: Juz[]): Juz[] { // for example if someone read juz 25-30 in the last cycle. next time she should read 1 (without 26-30).

    //   for (let i = NUM_OF_AJZA - 1; i > 0; i--) { // special case for juz 1, as 1 comes after 30
    //     if (newCycleAjza[i].owner == newCycleAjza[0].owner) {
    //       newCycleAjza[i] = {
    //         index: newCycleAjza[i].index,
    //         owner: null,
    //         status: JUZ_STATUS.IDLE
    //       };
    //     }
    //   }

    //   for (let i = NUM_OF_AJZA - 1; i > 0; i--) {
    //     if (newCycleAjza[i].owner != "") {
    //       for (let j = 1; j < i; j++) {
    //         if (newCycleAjza[j].owner == newCycleAjza[i].owner) {
    //           newCycleAjza[j] = {
    //             index: newCycleAjza[j].index,
    //             owner: null,
    //             status: JUZ_STATUS.IDLE
    //           };
    //         }
    //       }
    //     }
    //   }

    //   return newCycleAjza;

    // }

    let currentSequentialKhitma = <KhitmaGroup_Sequential>this._currentGroupObj;

    let ajzaObj = {};

    switch (newCycleType) {
      case KHITMA_CYCLE_TYPE.AUTO_BOOK:
        {
          let ajza = _generateNextCycleAjza(currentSequentialKhitma.ajza);
          // let ajzaWithoutDuplicates = _keepOnlyLastJuz(ajza);
          ajzaObj = KhitmaGroup_Sequential.convertAjzaToObj(ajza);
        }
        break;
      case KHITMA_CYCLE_TYPE.AUTO_BOOK_FOR_DONE_ONLY:
        {
          let ajza = _generateNextCycleAjzaForDoneOnly(
            currentSequentialKhitma.ajza
          );
          // let ajzaWithoutDuplicates = _keepOnlyLastJuz(ajza);
          ajzaObj = KhitmaGroup_Sequential.convertAjzaToObj(ajza);
        }
        break;
      case KHITMA_CYCLE_TYPE.ALL_IDLE:
        {
          ajzaObj = KhitmaGroup_Sequential.getEmptyAjzaObj();
        }
        break;
    }

    this.db
      .doc<any>('groups/' + this._currentGroupObj.id)
      .update({ cycle: newCycle, ajza: ajzaObj });
  }

  // ******** SAMETASK KHITMA

  updateGroupTask(groupId, newTask, currentCycle, resetedMembers) {
    this.db.doc<KhitmaGroup_SameTask>('groups/' + groupId).update({
      task: newTask,
      members: resetedMembers,
      cycle: currentCycle + 1,
    });
  }

  addGroupMember(groupId, memberName) {
    memberName = memberName.trim();

    let updatedObj = {};
    updatedObj['members.' + memberName] = {
      // "name": memberName,
      isTaskDone: false,
    };

    return this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
  }

  removeGroupMember(groupId, memberName) {
    let updatedObj = {};
    updatedObj['members'] = {};
    updatedObj['members'][memberName] =
      firebase.default.firestore.FieldValue.delete();

    return this.db
      .doc<any>('groups/' + groupId)
      .set(updatedObj, { merge: true });
  }

  updateMemberTask(groupId, memberName, isDone: boolean) {
    let updatedObj = {};

    updatedObj['members.' + memberName + '.isTaskDone'] = isDone;

    updatedObj['totalDoneTasks'] =
      firebase.default.firestore.FieldValue.increment(isDone ? 1 : -1);

    this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
  }

  // ******** GLOBAL KHITMA

  getGlobalKhitma(id) {
    return this.db.doc('global/' + id);
  }

  updateGlobalKhitaCounter(khitmaId, counterId, delta) {
    let obj = {};
    obj[counterId] = firebase.default.firestore.FieldValue.increment(delta);

    this.db.doc('global/' + khitmaId).update(obj);
  }

  globalKhitmaUpdateJuz(id, juzIndex, isDone) {
    let obj = {};

    const delta = isDone ? 1 : -1;

    obj['ajza.' + juzIndex] =
      firebase.default.firestore.FieldValue.increment(delta);
    obj['totalAjzaCounter'] =
      firebase.default.firestore.FieldValue.increment(delta);

    this.db.doc('global/' + id).update(obj);
  }

  globalKhitmaUpdateJuzFromGroup(id, isDone) {
    let obj = {};
    const delta = isDone ? 1 : -1;
    obj['totalAjzaCounter'] =
      firebase.default.firestore.FieldValue.increment(delta);

    this.db.doc('global/' + id).update(obj);
  }

  //** PAGES GROUP ************************************************************************************************** */

  updatePagesAndStart(groupId, members) {
    let updatedObj = {};
    updatedObj['members'] = members;
    updatedObj['isStarted'] = true;

    return this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
  }

  updateGroupMembers(groupId, members) {
    let updatedObj = {};
    updatedObj['members'] = members;

    return this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
  }

  updateGroupStartStatus(groupId, isStarted) {
    let updatedObj = {};
    updatedObj['isStarted'] = isStarted;

    return this.db.doc<KhitmaGroup>('groups/' + groupId).update(updatedObj);
  }
}
