import { TestBed } from '@angular/core/testing';

import { GlobalCountersService } from './global-counters.service';

describe('GlobalCountersService', () => {
  let service: GlobalCountersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalCountersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
