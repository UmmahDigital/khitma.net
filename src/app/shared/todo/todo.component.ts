import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-todo',
    templateUrl: './todo.component.html',
    styleUrls: ['./todo.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TodoComponent implements OnInit {

  @Input() isDone: boolean;

  @Output() onToggled?= new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }


  toggled() {
    this.onToggled.emit(this.isDone);

  }

}
