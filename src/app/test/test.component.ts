import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { JUZ_STATUS, KhitmaGroup, KhitmaGroup_SameTask } from '../entities/entities';
import { map, catchError, take, first } from 'rxjs/operators';

// import * as firestore from "../../../node_modules/firebase";
import { KhitmaGroupService } from '../khitma-group.service';


import * as firebase from 'firebase/compat/app';
// import undefined from 'firebase/compat/firestore';



@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {

  constructor(private db: AngularFirestore, private groupsApi: KhitmaGroupService) { }

  ngOnInit(): void {
  }

  clicked() {

    // let updatedObj = {
    //   ajza: []
    // };

    // for (let i = 0; i < 30; i++) {
    //   updatedObj.ajza.push({
    //     index: i,
    //     status: JUZ_STATUS.DONE,
    //     owner: "hasan" + (i + 1)
    //   });
    // }

    // this.db.doc<any>('groups/Zm5B2MkL3Bt781Y6nsdJ').update(updatedObj);




    let updatedObj = {};

    for (let i = 0; i < 30; i++) {
      updatedObj["ajza." + i + ".status"] = JUZ_STATUS.BOOKED

    }

    this.db.doc<any>('groups/Zm5B2MkL3Bt781Y6nsdJ').update(updatedObj);








    // this.db.doc<SameTaskKhitmaGroup>('groups/JQQVZKetquaDjvtDhFvj').update({ "task": "مهمة جديدة" });


    // *****

    // let updatedObj = {};
    // updatedObj[("members." + "سجود")] = {
    //   name: "سجود",
    //   isTaskDone: false
    // };

    // this.db.doc<KhitmaGroup>('groups/' + "JQQVZKetquaDjvtDhFvj").update(updatedObj);




    // // ****
    // let updatedObj = {};
    // updatedObj["members"] = {};
    // updatedObj["members"]["محمد"] = firebase.default.firestore.FieldValue.delete();

    // return this.db.doc<any>('groups/' + "nHDpOcrv0XRoa2iLbMgq").set(updatedObj, { merge: true });

  }

}
