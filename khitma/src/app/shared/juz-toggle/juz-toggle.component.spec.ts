import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JuzToggleComponent } from './juz-toggle.component';

describe('JuzToggleComponent', () => {
  let component: JuzToggleComponent;
  let fixture: ComponentFixture<JuzToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JuzToggleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JuzToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
