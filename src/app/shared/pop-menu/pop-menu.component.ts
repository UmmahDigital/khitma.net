import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-pop-menu',
    templateUrl: './pop-menu.component.html',
    styleUrls: ['./pop-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PopMenuComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<PopMenuComponent>) { }

  ngOnInit(): void {
  }

}
