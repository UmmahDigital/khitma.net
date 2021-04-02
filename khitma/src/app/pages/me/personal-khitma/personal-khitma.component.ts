import { Component, OnInit } from '@angular/core';
import { Juz, JUZ_STATUS, KhitmaGroup } from 'src/app/entities/entities';
import { LocalDatabaseService } from 'src/app/local-database.service';

@Component({
  selector: 'app-personal-khitma',
  templateUrl: './personal-khitma.component.html',
  styleUrls: ['./personal-khitma.component.scss']
})
export class PersonalKhitmaComponent implements OnInit {

  ajza: Juz[];

  constructor(private localDB: LocalDatabaseService) {

  }

  ngOnInit(): void {

    this.ajza = <Juz[]>this.localDB.getMyPersonalKhitmah();

  }

  juzSelected(juz: Juz) {

    this.ajza[juz.index] = new Juz({
      index: juz.index,
      status: Juz.nextStatus(juz.status)
    });

    this.localDB.updateMyPersonalKhitmah(this.ajza);

  }
}
