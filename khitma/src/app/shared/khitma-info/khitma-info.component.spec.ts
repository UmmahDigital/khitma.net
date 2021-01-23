import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KhitmaInfoComponent } from './khitma-info.component';

describe('KhitmaInfoComponent', () => {
  let component: KhitmaInfoComponent;
  let fixture: ComponentFixture<KhitmaInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KhitmaInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KhitmaInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
