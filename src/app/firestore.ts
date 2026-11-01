import { InjectionToken } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  DocumentReference,
  Firestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  Query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export const FIRESTORE = new InjectionToken<Firestore>('Firestore', {
  providedIn: 'root',
  factory: () => {
    // Groups are kept on the phone (IndexedDB, shared by its tabs): they open at once on the next visit, and what
    // people change without a connection is sent when it returns, even after the page was closed. Where the phone
    // can't keep them (no IndexedDB, or a broken one), Firestore falls back to memory, as before.
    const firestore = initializeFirestore(initializeApp(environment.firebaseConfig), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (environment.useEmulators) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
    return firestore;
  },
});

/** Live document data, like AngularFire's `valueChanges()`. With `idField`, the document ID is set under that key. */
export function watchDoc<T = any>(ref: DocumentReference, idField?: string): Observable<T> {
  return new Observable<T>((subscriber) =>
    onSnapshot(
      ref,
      (snapshot) =>
        subscriber.next((idField ? { ...snapshot.data(), [idField]: snapshot.id } : snapshot.data()) as T),
      (error) => subscriber.error(error)
    )
  );
}

/** Live query results, like AngularFire's collection `valueChanges()`. */
export function watchQuery<T = any>(query: Query, idField?: string): Observable<T[]> {
  return new Observable<T[]>((subscriber) =>
    onSnapshot(
      query,
      (snapshot) =>
        subscriber.next(
          snapshot.docs.map((d) => (idField ? { ...d.data(), [idField]: d.id } : d.data()) as T)
        ),
      (error) => subscriber.error(error)
    )
  );
}
