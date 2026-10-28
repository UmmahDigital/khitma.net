import { Inject, Injectable } from '@angular/core';
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

import { forkJoin, from, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  Firestore,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { FIRESTORE, watchDoc } from './firestore';
import { LocalDatabaseService } from './local-database.service';

@Injectable({
  providedIn: 'root',
})
export class KhitmaGroupService {
  private _currentGroup = new Subject();
  private _currentGroupObj: KhitmaGroup = null;

  private _isV2Api = true;

  constructor(
    @Inject(FIRESTORE) private db: Firestore,
    private localDB: LocalDatabaseService
  ) {}

  private groupDoc(groupId: string) {
    return doc(this.db, 'groups', groupId);
  }

  public getGroupDetailsOnce(groupId: string): Observable<KhitmaGroup> {
    return from(getDoc(this.groupDoc(groupId))).pipe(
      map((snapshot) => {
        const data = snapshot.data();
        const id = snapshot.id;
        return { id, ...data } as KhitmaGroup;
      })
    );
  }

  public setCurrentGroup(groupId: string) {
    watchDoc(this.groupDoc(groupId), 'id')
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

  public createGroup(title, description, author, groupType?, firstTask?, deadline?: { targetAt: string; targetDate: string } | null) {
    return this.createGroupForUser(
      title,
      description,
      author,
      null,
      groupType,
      firstTask,
      deadline
    );
  }

  public createGroupForUser(
    title,
    description,
    author,
    authorId?,
    groupType?,
    firstTask?,
    deadline?: { targetAt: string; targetDate: string } | null
  ) {
    author = author.trim();

    let newGroupObj = {
      title: title,
      description: description || '',
      author: author,
      type: groupType,
      cycle: 0,
      authorId: authorId || '',
      createdAt: serverTimestamp(),
      ...(deadline ? { targetAt: deadline.targetAt, targetDate: deadline.targetDate } : {}),
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

    return addDoc(collection(this.db, 'groups'), newGroupObj);
  }

  public getGroupURL(groupId: string) {
    return location.origin + '/group/' + groupId;
  }

  public isValidGroup(group: KhitmaGroup) {
    return group && group.title ? true : false;
  }

  /** `targetDateChanged`: the admin typed a new date, so the date picked at creation (targetAt) no longer applies. */
  public updateGroupInfo(groupId, title, description, targetDate, admins, targetDateChanged = false) {
    updateDoc(this.groupDoc(groupId), {
      title: title,
      description: description || '',
      targetDate: targetDate || '',
      admins: admins || '',
      ...(targetDateChanged ? { targetAt: deleteField() } : {}),
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

    // When the last juz is done, the round is recorded as completed, in the same write.
    const completedRound = juzStatus == JUZ_STATUS.DONE &&
      currentSequentialKhitma.ajza.every((juz) => juz.status == JUZ_STATUS.DONE)
      ? { ['completedRounds.' + (currentSequentialKhitma.cycle || 0)]: serverTimestamp() }
      : {};

    if (this._isV2Api) {
      let updatedObj = {};
      // updatedAt: when this juz last changed, e.g. how long a booking has been waiting.
      updatedObj['ajza.' + juzIndex] = { ...currentSequentialKhitma.ajza[juzIndex], updatedAt: serverTimestamp() };

      updateDoc(this.groupDoc(groupId), { ...updatedObj, ...completedRound });
    } else {
      // LEGACY CODE
      updateDoc(this.groupDoc(groupId), { ajza: currentSequentialKhitma.ajza, ...completedRound });
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

  getGroups(groupsIds: string[]) {
    let groups$ = [];

    groupsIds.forEach((groupId) => {
      groups$.push(this.getGroupDetailsOnce(groupId));
    });

    return forkJoin(groups$);
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
      case KHITMA_CYCLE_TYPE.REWIND:
        {
          let ajza = KhitmaGroup_Sequential.getPreviousCycleAjza(
            currentSequentialKhitma.ajza
          );
          ajzaObj = KhitmaGroup_Sequential.convertAjzaToObj(ajza);
        }
        break;
    }

    // Every juz of the new round starts now (bookings made for members included).
    for (const key of Object.keys(ajzaObj)) {
      ajzaObj[key] = { ...ajzaObj[key], updatedAt: serverTimestamp() };
    }

    updateDoc(this.groupDoc(this._currentGroupObj.id), { cycle: newCycle, ajza: ajzaObj, roundStartedAt: serverTimestamp() });
  }

  // ******** SAMETASK KHITMA

  updateGroupTask(groupId, newTask, currentCycle, resetedMembers) {
    updateDoc(this.groupDoc(groupId), {
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

    return updateDoc(this.groupDoc(groupId), updatedObj);
  }

  removeGroupMember(groupId, memberName) {
    let updatedObj = {};
    updatedObj['members'] = {};
    updatedObj['members'][memberName] = deleteField();

    return setDoc(this.groupDoc(groupId), updatedObj, { merge: true });
  }

  updateMemberTask(groupId, memberName, isDone: boolean) {
    let updatedObj = {};

    updatedObj['members.' + memberName + '.isTaskDone'] = isDone;

    updatedObj['totalDoneTasks'] = increment(isDone ? 1 : -1);

    updateDoc(this.groupDoc(groupId), updatedObj);
  }

  // ******** GLOBAL KHITMA

  private globalDoc(id: string) {
    return doc(this.db, 'global', id);
  }

  watchGlobalKhitma(id: string): Observable<any> {
    return watchDoc(this.globalDoc(id));
  }

  getGlobalKhitmaOnce(id: string): Observable<any> {
    return from(getDoc(this.globalDoc(id))).pipe(map((snapshot) => snapshot.data()));
  }

  updateGlobalKhitaCounter(khitmaId, counterId, delta) {
    let obj = {};
    obj[counterId] = increment(delta);

    updateDoc(this.globalDoc(khitmaId), obj);
  }

  globalKhitmaUpdateJuz(id, juzIndex, isDone) {
    let obj = {};

    const delta = isDone ? 1 : -1;

    obj['ajza.' + juzIndex] = increment(delta);
    obj['totalAjzaCounter'] = increment(delta);

    updateDoc(this.globalDoc(id), obj);
  }

  globalKhitmaUpdateJuzFromGroup(id, isDone) {
    let obj = {};
    const delta = isDone ? 1 : -1;
    obj['totalAjzaCounter'] = increment(delta);

    updateDoc(this.globalDoc(id), obj);
  }

  //** PAGES GROUP ************************************************************************************************** */

  updatePagesAndStart(groupId, members) {
    let updatedObj = {};
    updatedObj['members'] = members;
    updatedObj['isStarted'] = true;

    return updateDoc(this.groupDoc(groupId), updatedObj);
  }

  updateGroupMembers(groupId, members) {
    let updatedObj = {};
    updatedObj['members'] = members;

    return updateDoc(this.groupDoc(groupId), updatedObj);
  }

  updateGroupStartStatus(groupId, isStarted) {
    let updatedObj = {};
    updatedObj['isStarted'] = isStarted;

    return updateDoc(this.groupDoc(groupId), updatedObj);
  }
}
