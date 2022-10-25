import { TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistListPageResolverService } from './artist-list-page-resolver.service';

describe('ArtistListPageResolverService', () => {
  let service: ArtistListPageResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ArtistListPageResolverService,
        {
          provide: ArtistStateService,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(ArtistListPageResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
