import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditKhitmaDetailsComponent } from './edit-khitma-details.component';

describe('EditKhitmaDetailsComponent', () => {
  let component: EditKhitmaDetailsComponent;
  let fixture: ComponentFixture<EditKhitmaDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditKhitmaDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditKhitmaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
