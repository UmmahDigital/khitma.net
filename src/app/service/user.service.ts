import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../common/model';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  user: User;
  constructor(private db: AngularFirestore) { }

  saveUserLoging(user: User) {
    this.saveUserToDbIfNotExists(user);
    return this.user;
  }

  get currentUser(): User {
    const usr = localStorage.getItem("login");
    if (usr) {
      return JSON.parse(usr);
    }
  }

  logout() {
    localStorage.removeItem("login");
  }


  getUserFromDbById(id: string): Observable<User> {
    return this.db.doc<User>('users/' + id).get().pipe(map(res => {
      const data = (<any>res).data();
      const id = (<any>res).id;
      return { id, ...data };
    }));
  }

  async getUserFromDbByEmail(email: string) {
    const userDocRef = this.db.collection<User>('users');
    const querySnapshot = await userDocRef.ref.where("email", "==", email).get();
    if (querySnapshot.size > 0) {
      return querySnapshot.docs[0].data();
    } else {
      return null;
    }

  }

  saveUserToDbIfNotExists(user: User) {
    this.getUserFromDbByEmail(user.email).then(userExists => {
      if (!userExists) {
        user.created = new Date();
        this.db.collection<User>('users').add(user).then(doc => {
          user.id = doc.id;
          this.user = user;
          localStorage.setItem("login", JSON.stringify(user));
          // console.log("user created");
        })
      } else {
        // console.log("user already exists");
        localStorage.setItem("login", JSON.stringify(userExists));
      }
    })
  }




}
