import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { JUZ_STATUS, KhitmaGroup } from '../entities/entities';
import { map, catchError, take, first } from 'rxjs/operators';

import firestore from "../../../node_modules/firebase";
import { KhitmaGroupService } from '../khitma-group.service';


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

    for (let i = 0; i < 30; i++) {

      let updatedObj = {};
      updatedObj[("ajza." + i)] = {
        index: i,
        status: JUZ_STATUS.DONE,
        owner: "hasan"
      };

      this.db.doc<KhitmaGroup>('groups/hlmyHyxkah2KuPTtUFAz').update(updatedObj);

    }
  }

}
