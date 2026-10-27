import { Component, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-pop-menu',
  templateUrl: './pop-menu.component.html',
  styleUrls: ['./pop-menu.component.scss'],

})
export class PopMenuComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<PopMenuComponent>) { }

  ngOnInit(): void {
  }

}
