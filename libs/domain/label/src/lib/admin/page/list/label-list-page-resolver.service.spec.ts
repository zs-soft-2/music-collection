import { TestBed } from '@angular/core/testing';
import { LabelStateService } from '@music-collection/api';

import { LabelListPageResolverService } from './label-list-page-resolver.service';

describe('LabelListPageResolverService', () => {
  let service: LabelListPageResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LabelListPageResolverService,
        {
          provide: LabelStateService,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(LabelListPageResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
