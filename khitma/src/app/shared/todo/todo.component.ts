import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {

  @Input() text: string;
  @Input() isDone: boolean;

  @Output() onToggled?= new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }


  toggled() {
    this.onToggled.emit(this.isDone);

  }

}
