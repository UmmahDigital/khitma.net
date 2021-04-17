import { TestBed } from '@angular/core/testing';

import { KhitmaGroupService } from './khitma-group.service';

describe('KhitmaGroupService', () => {
  let service: KhitmaGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KhitmaGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
