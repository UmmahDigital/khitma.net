import { TestBed } from '@angular/core/testing';

import { NativeShareService } from './native-share.service';

describe('NativeShareService', () => {
  let service: NativeShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NativeShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
