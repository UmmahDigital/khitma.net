import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuranComponent } from './quran.component';

describe('QuranComponent', () => {
  let component: QuranComponent;
  let fixture: ComponentFixture<QuranComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuranComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuranComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
