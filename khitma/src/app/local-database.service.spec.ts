import { TestBed } from '@angular/core/testing';

import { LocalDatabaseService } from './local-database.service';

describe('LocalDatabaseService', () => {
  let service: LocalDatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalDatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
