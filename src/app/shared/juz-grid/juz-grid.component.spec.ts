import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JuzGridComponent } from './juz-grid.component';

describe('JuzGridComponent', () => {
  let component: JuzGridComponent;
  let fixture: ComponentFixture<JuzGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JuzGridComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JuzGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
