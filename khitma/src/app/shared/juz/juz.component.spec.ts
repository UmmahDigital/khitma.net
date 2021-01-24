import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JuzComponent } from './juz.component';

describe('JuzComponent', () => {
  let component: JuzComponent;
  let fixture: ComponentFixture<JuzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JuzComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JuzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
