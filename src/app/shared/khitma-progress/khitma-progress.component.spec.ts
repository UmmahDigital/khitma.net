import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KhitmaProgressComponent } from './khitma-progress.component';

describe('KhitmaProgressComponent', () => {
  let component: KhitmaProgressComponent;
  let fixture: ComponentFixture<KhitmaProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KhitmaProgressComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KhitmaProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
