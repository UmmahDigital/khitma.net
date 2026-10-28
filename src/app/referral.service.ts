import { Inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { GoogleAnalyticsService } from './analytics';
import { FIRESTORE } from './firestore';
import {
  isRefCode,
  newRefCode,
  REF_CODE_KEY,
  REF_SHARED_KEY,
  Referrals,
  REFERRALS_KEY,
  RefStats,
  withRef,
} from './referral';

export type ReferralCredit = 'joined' | 'read' | 'started';

/** A shared link counts for a join only if it was opened in the last month. */
const LANDING_VALID_MS = 30 * 86_400_000;

/** Links that carry this phone's reference, and the counts of what came of them (see referral.ts). */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private impact: Promise<RefStats | null> | null = null;

  constructor(
    @Inject(FIRESTORE) private db: Firestore,
    private analytics: GoogleAnalyticsService
  ) {}

  /** This phone's code, made the first time a link is shared from it. */
  get myCode(): string {
    let code = localStorage.getItem(REF_CODE_KEY);
    if (!isRefCode(code)) {
      code = newRefCode();
      localStorage.setItem(REF_CODE_KEY, code);
    }
    return code;
  }

  /** The group's link, carrying this phone's reference. */
  groupUrl(groupId: string): string {
    return withRef(location.origin + '/group/' + groupId, this.myCode);
  }

  /** The home page, carrying this phone's reference: for inviting people to start khitmas of their own. */
  homeUrl(): string {
    return withRef(location.origin + '/', this.myCode);
  }

  /** Called on every share: from now on, this phone looks up what its invitations brought about. */
  noteShared(): void {
    localStorage.setItem(REF_SHARED_KEY, '1');
  }

  /**
   * Counts a join, a juz read or a khitma started, for the code of the link that brought this person here:
   * - joined: once per group, and only when they opened that group's link (recently);
   * - read: each juz finished in a group they joined through a link;
   * - started: their first khitma of their own, if any link brought them here.
   */
  credit(kind: ReferralCredit, groupId?: string): Promise<void> {
    const referrals = this.read();
    let code: string | undefined;
    if (kind === 'joined') {
      const landing = referrals.landing;
      if (!landing || !groupId || landing.groupId !== groupId || Date.now() - landing.at > LANDING_VALID_MS) {
        return Promise.resolve();
      }
      if (referrals.groups?.[groupId]) {
        return Promise.resolve();
      }
      code = landing.code;
      referrals.groups = { ...referrals.groups, [groupId]: code };
    } else if (kind === 'read') {
      code = groupId ? referrals.groups?.[groupId] : undefined;
    } else {
      code = referrals.started ? undefined : referrals.landing?.code;
      referrals.started = !!code || referrals.started;
    }
    if (!code) {
      return Promise.resolve();
    }
    this.write(referrals);
    this.analytics.send('referral_credit', { kind });
    const saved = setDoc(doc(this.db, 'refs', code), { [kind]: increment(1), updatedAt: serverTimestamp() }, { merge: true });
    return Promise.race([saved.catch(() => {}), new Promise<void>((resolve) => setTimeout(resolve, 2000))]);
  }

  /** What this phone's invitations brought about, if it ever shared a link. */
  myImpact(): Promise<RefStats | null> {
    const code = localStorage.getItem(REF_CODE_KEY);
    if (!isRefCode(code) || !localStorage.getItem(REF_SHARED_KEY)) {
      return Promise.resolve(null);
    }
    this.impact ??= getDoc(doc(this.db, 'refs', code))
      .then((snapshot) => (snapshot.exists() ? (snapshot.data() as RefStats) : null))
      .catch(() => null);
    return this.impact;
  }

  private read(): Referrals {
    try {
      return JSON.parse(localStorage.getItem(REFERRALS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private write(referrals: Referrals): void {
    localStorage.setItem(REFERRALS_KEY, JSON.stringify(referrals));
  }
}
