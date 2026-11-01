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
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { FIRESTORE, watchDoc } from './firestore';
import { isRoundDue, nextRoundAt, RoundSchedule } from './schedule';
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

  public createGroup(
    title, description, author, groupType?, firstTask?,
    deadline?: { targetAt: string; targetDate: string } | null,
    purpose?: { purpose: string; honoreeGender?: 'male' | 'female' } | null,
    schedule?: RoundSchedule | null
  ) {
    return this.createGroupForUser(
      title,
      description,
      author,
      null,
      groupType,
      firstTask,
      deadline,
      purpose,
      schedule
    );
  }

  public createGroupForUser(
    title,
    description,
    author,
    authorId?,
    groupType?,
    firstTask?,
    deadline?: { targetAt: string; targetDate: string } | null,
    purpose?: { purpose: string; honoreeGender?: 'male' | 'female' } | null,
    schedule?: RoundSchedule | null
  ) {
    author = author.trim();
    const firstRound = schedule ? nextRoundAt(schedule, new Date()) : null;

    let newGroupObj = {
      title: title,
      description: description || '',
      author: author,
      type: groupType,
      cycle: 0,
      authorId: authorId || '',
      createdAt: serverTimestamp(),
      ...(deadline ? { targetAt: deadline.targetAt, targetDate: deadline.targetDate } : {}),
      ...(purpose?.purpose ? { purpose: purpose.purpose } : {}),
      ...(purpose?.honoreeGender ? { honoreeGender: purpose.honoreeGender } : {}),
      ...(schedule ? { schedule, ...(firstRound ? { nextRoundAt: Timestamp.fromDate(firstRound) } : {}) } : {}),
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

  /**
   * Starts the next round, or goes one back (KHITMA_CYCLE_TYPE.REWIND), from the group as the server has it: a page
   * opened from the phone's cache, or offline, must not overwrite what others changed meanwhile. Needs a connection;
   * resolves to the new round's number.
   */
  startNewSequentialKhitmaCycle(groupId: string, newCycleType: number): Promise<number> {
    const ref = this.groupDoc(groupId);
    return runTransaction(this.db, async (transaction) => {
      const data: any = (await transaction.get(ref)).data();
      const ajza: Juz[] = Array.isArray(data.ajza) ? data.ajza : KhitmaGroup_Sequential.convertAjzaToArray(data.ajza);
      const cycle = newCycleType === KHITMA_CYCLE_TYPE.REWIND ? Math.max(0, (data.cycle || 0) - 1) : (data.cycle || 0) + 1;
      transaction.update(ref, { cycle, ajza: newRoundAjzaObj(nextRoundAjza(ajza, newCycleType)), roundStartedAt: serverTimestamp() });
      return cycle;
    });
  }

  /** Repeats the khitma on a rhythm (see schedule.ts), or stops repeating it (null); `startAt` sets the first round. */
  setSchedule(groupId: string, schedule: RoundSchedule | null, startAt?: Date) {
    const next = schedule ? startAt ?? nextRoundAt(schedule, new Date()) : null;
    return updateDoc(this.groupDoc(groupId), {
      schedule: schedule ?? deleteField(),
      nextRoundAt: next ? Timestamp.fromDate(next) : deleteField(),
    });
  }

  /**
   * Starts the next round of a repeating khitma if it's due, in a transaction: when several members open the group
   * at once, only one of them starts it. Resolves to whether this call started it.
   */
  startScheduledRound(groupId: string): Promise<boolean> {
    const ref = this.groupDoc(groupId);
    return runTransaction(this.db, async (transaction) => {
      const data: any = (await transaction.get(ref)).data();
      if (!data) {
        return false;
      }
      const ajza: Juz[] = Array.isArray(data.ajza) ? data.ajza : KhitmaGroup_Sequential.convertAjzaToArray(data.ajza);
      const now = new Date();
      if (ajza.length !== NUM_OF_AJZA || !isRoundDue({ ...data, ajza }, now.getTime())) {
        return false;
      }
      const next = nextRoundAt(data.schedule, now);
      transaction.update(ref, {
        cycle: (data.cycle || 0) + 1,
        ajza: newRoundAjzaObj(nextRoundAjza(ajza, data.schedule.cycleType)),
        roundStartedAt: serverTimestamp(),
        nextRoundAt: next ? Timestamp.fromDate(next) : deleteField(),
      });
      return true;
    });
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

/** The ajza of a new round, from the last one's (KHITMA_CYCLE_TYPE). */
export function nextRoundAjza(ajza: Juz[], cycleType: number): Juz[] {
  // Everyone moves to the juz after theirs (after 30 comes 1).
  const shifted = (keep: (juz: Juz) => boolean) =>
    Array.from({ length: NUM_OF_AJZA }, (_, i) => {
      const previous = ajza[i == 0 ? NUM_OF_AJZA - 1 : i - 1];
      return keep(previous)
        ? new Juz({ index: i, owner: previous.owner || '', status: JUZ_STATUS.BOOKED })
        : new Juz({ index: i, owner: '', status: JUZ_STATUS.IDLE });
    });

  switch (cycleType) {
    case KHITMA_CYCLE_TYPE.AUTO_BOOK:
      return shifted((juz) => juz.status != JUZ_STATUS.IDLE);
    case KHITMA_CYCLE_TYPE.AUTO_BOOK_FOR_DONE_ONLY:
      return shifted((juz) => juz.status == JUZ_STATUS.DONE);
    case KHITMA_CYCLE_TYPE.REWIND:
      return KhitmaGroup_Sequential.getPreviousCycleAjza(ajza);
    default:
      return KhitmaGroup_Sequential.getEmptyAjzaArray();
  }
}

/** As stored: a map by index, every juz of the new round starting now (bookings made for members included). */
function newRoundAjzaObj(ajza: Juz[]) {
  const ajzaObj = KhitmaGroup_Sequential.convertAjzaToObj(ajza);
  for (const key of Object.keys(ajzaObj)) {
    ajzaObj[key] = { ...ajzaObj[key], updatedAt: serverTimestamp() };
  }
  return ajzaObj;
}
