import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalKhitmaComponent } from './global-khitma.component';

describe('GlobalKhitmaComponent', () => {
  let component: GlobalKhitmaComponent;
  let fixture: ComponentFixture<GlobalKhitmaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GlobalKhitmaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalKhitmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
