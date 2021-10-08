import { Component, OnInit } from '@angular/core';
import { CelebrationService } from 'src/app/celebration.service';
import { NUM_OF_PAGES } from 'src/app/entities/entities';
import { GlobalCountersService } from 'src/app/global-counters.service';
import { LocalDatabaseService } from 'src/app/local-database.service';

@Component({
  selector: 'app-aqsa-khitma',
  templateUrl: './aqsa-khitma.component.html',
  styleUrls: ['./aqsa-khitma.component.scss']
})
export class AqsaKhitmaComponent implements OnInit {

  myPages = null;
  counters = null;
  lastGrantedPage = null;

  constructor(
    private localDB: LocalDatabaseService,
    private globalCounters: GlobalCountersService,
    private celebrationService: CelebrationService) {
    this.myPages = this.localDB.getMyAqsaKhitmaPages();
  }

  ngOnInit(): void {

    this.globalCounters.aqsaKhitmaCounters().subscribe((res: any) => {

      this.counters = res.pages;

      this.lastGrantedPage = this.counters.granted % NUM_OF_PAGES;

    });

  }

  doneReadingMyPages() {
    this.globalCounters.aqsaKhitmaPagesDone(this.myPages);
    this.myPages = null;
    this.localDB.setMyAqsaKhitmaPages(this.myPages);

    this.celebrationService.celebrate();

  }

  giveMePages(numOfPages) {

    numOfPages = parseInt(numOfPages);

    this.myPages = {
      from: this.lastGrantedPage + 1,
      to: this.lastGrantedPage + numOfPages
    }

    this.globalCounters.aqsaKhitmaBookPages(numOfPages);
    this.localDB.setMyAqsaKhitmaPages(this.myPages);
  }

}
