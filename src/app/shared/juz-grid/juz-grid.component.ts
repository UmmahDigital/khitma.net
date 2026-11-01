import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';

import { Juz, JUZ_STATUS } from '../../entities/entities';
import { CommonService } from '../../service/common.service';
import { fill } from '../../share-messages';

@Component({
    selector: 'app-juz-grid',
    templateUrl: './juz-grid.component.html',
    styleUrls: ['./juz-grid.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class JuzGridComponent implements OnInit {

  @Input() ajza: Juz[];
  @Input() myAjzaIndexes: number[] = [];
  /** The juz just finished on this phone, whose circle marks the moment. */
  @Input() celebrateJuzIndex: number = null;
  @Output() onJuzSelection = new EventEmitter<Juz>();

  constructor(private common: CommonService) { }

  ngOnInit(): void {
  }

  /** What a screen reader says for a juz: its number, its state, and whose it is (when the group has names). */
  label(juz: Juz): string {
    const t = this.common.translation.juz ?? {};
    const n = juz.index + 1;
    const name = (juz.owner || '').trim();
    if (juz.status === JUZ_STATUS.DONE) {
      return name ? fill(t.a11yDone || 'الجزء {n}، تمّت قراءته ({name})', { n, name }) : fill(t.a11yDoneNoName || 'الجزء {n}، تمّت قراءته', { n });
    }
    if (juz.status === JUZ_STATUS.BOOKED) {
      if (this.myAjzaIndexes.indexOf(juz.index) >= 0) {
        return fill(t.a11yMine || 'الجزء {n}، محجوز لك', { n });
      }
      return name ? fill(t.a11yBooked || 'الجزء {n}، محجوز باسم {name}', { n, name }) : fill(t.a11yBookedNoName || 'الجزء {n}، محجوز', { n });
    }
    return fill(t.a11yFree || 'الجزء {n}، متاح', { n });
  }

  juzClicked(juz: Juz) {

    // if (juz.status != JUZ_STATUS.IDLE) {
    //   return;
    // }

    this.onJuzSelection.emit(juz);
  }

}
