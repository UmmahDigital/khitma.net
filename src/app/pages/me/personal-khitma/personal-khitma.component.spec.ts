import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalKhitmaComponent } from './personal-khitma.component';

describe('PersonalKhitmaComponent', () => {
  let component: PersonalKhitmaComponent;
  let fixture: ComponentFixture<PersonalKhitmaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PersonalKhitmaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonalKhitmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
