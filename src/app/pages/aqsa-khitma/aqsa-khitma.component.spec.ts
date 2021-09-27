import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AqsaKhitmaComponent } from './aqsa-khitma.component';

describe('AqsaKhitmaComponent', () => {
  let component: AqsaKhitmaComponent;
  let fixture: ComponentFixture<AqsaKhitmaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AqsaKhitmaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AqsaKhitmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
