import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KhitmaDoneCelebrationComponent } from './khitma-done-celebration.component';

describe('KhitmaDoneCelebrationComponent', () => {
  let component: KhitmaDoneCelebrationComponent;
  let fixture: ComponentFixture<KhitmaDoneCelebrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KhitmaDoneCelebrationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KhitmaDoneCelebrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
