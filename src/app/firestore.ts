import { InjectionToken } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  DocumentReference,
  Firestore,
  getFirestore,
  onSnapshot,
  Query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export const FIRESTORE = new InjectionToken<Firestore>('Firestore', {
  providedIn: 'root',
  factory: () => {
    const firestore = getFirestore(initializeApp(environment.firebaseConfig));
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
