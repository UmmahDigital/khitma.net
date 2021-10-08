import { TestBed } from '@angular/core/testing';

import { CelebrationService } from './celebration.service';

describe('CelebrationService', () => {
  let service: CelebrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CelebrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
