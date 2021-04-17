import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private snackBar: MatSnackBar) { }

  public show(msg: string, duration?: number) {
    this.snackBar.open(msg, '', { duration: duration || 2000 });
  }
}
