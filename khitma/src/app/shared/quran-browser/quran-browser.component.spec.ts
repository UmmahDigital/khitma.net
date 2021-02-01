import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuranBrowserComponent } from './quran-browser.component';

describe('QuranBrowserComponent', () => {
  let component: QuranBrowserComponent;
  let fixture: ComponentFixture<QuranBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuranBrowserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuranBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
