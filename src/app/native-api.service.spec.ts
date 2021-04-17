import { TestBed } from '@angular/core/testing';

import { NativeApiService } from './native-api.service';

describe('NativeApiService', () => {
  let service: NativeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NativeApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
