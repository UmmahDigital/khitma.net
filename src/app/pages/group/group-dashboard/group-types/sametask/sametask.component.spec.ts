import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SametaskComponent } from './sametask.component';

describe('SametaskComponent', () => {
  let component: SametaskComponent;
  let fixture: ComponentFixture<SametaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SametaskComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SametaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
