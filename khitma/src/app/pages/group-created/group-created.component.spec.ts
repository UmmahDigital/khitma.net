import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupCreatedComponent } from './group-created.component';

describe('GroupCreatedComponent', () => {
  let component: GroupCreatedComponent;
  let fixture: ComponentFixture<GroupCreatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupCreatedComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupCreatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
