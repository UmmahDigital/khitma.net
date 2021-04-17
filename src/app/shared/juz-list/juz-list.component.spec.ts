import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JuzListComponent } from './juz-list.component';

describe('JuzListComponent', () => {
  let component: JuzListComponent;
  let fixture: ComponentFixture<JuzListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JuzListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JuzListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
