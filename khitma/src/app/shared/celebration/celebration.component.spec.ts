import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CelebrationComponent } from './celebration.component';

describe('CelebrationComponent', () => {
  let component: CelebrationComponent;
  let fixture: ComponentFixture<CelebrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CelebrationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CelebrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
