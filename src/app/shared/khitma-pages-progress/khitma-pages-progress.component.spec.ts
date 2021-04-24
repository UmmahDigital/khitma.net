import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KhitmaPagesProgressComponent } from './khitma-pages-progress.component';

describe('KhitmaPagesProgressComponent', () => {
  let component: KhitmaPagesProgressComponent;
  let fixture: ComponentFixture<KhitmaPagesProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KhitmaPagesProgressComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KhitmaPagesProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
