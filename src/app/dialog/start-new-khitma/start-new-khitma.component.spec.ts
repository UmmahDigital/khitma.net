import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartNewKhitmaComponent } from './start-new-khitma.component';

describe('StartNewKhitmaComponent', () => {
  let component: StartNewKhitmaComponent;
  let fixture: ComponentFixture<StartNewKhitmaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StartNewKhitmaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StartNewKhitmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
