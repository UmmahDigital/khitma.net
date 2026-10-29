import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Params } from '@angular/router';
import { GET_JUZ_READ_EXTERNAL_URL } from 'src/app/entities/entities';
import { SharedModule } from '../../modules/shared.module';

@Component({
    selector: 'app-quran',
    templateUrl: './quran.component.html',
    styleUrls: ['./quran.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [SharedModule]
})
export class QuranComponent implements OnInit {

  urlSafe: SafeResourceUrl;

  constructor(public sanitizer: DomSanitizer, private route: ActivatedRoute,) { }

  ngOnInit() {

    this.route.params.subscribe(
      (params: Params): void => {

        let juzActualIndex = params.juzIndex || 1;

        let url = GET_JUZ_READ_EXTERNAL_URL(juzActualIndex - 1);
        this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      });


  }
}
