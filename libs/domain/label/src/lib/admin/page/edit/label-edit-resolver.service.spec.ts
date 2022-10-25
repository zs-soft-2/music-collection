import { TestBed } from '@angular/core/testing';

import { LabelEditResolverService } from './label-edit-resolver.service';

describe('LabelEditResolverService', () => {
  let service: LabelEditResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LabelEditResolverService],
    });

    service = TestBed.inject(LabelEditResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
