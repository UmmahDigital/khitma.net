import { TestBed } from '@angular/core/testing';

import { Alert } from './alert.service';

describe('NotifyService', () => {
  let service: Alert;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Alert);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
