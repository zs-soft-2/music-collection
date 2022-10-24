import { TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistListResolverService } from './artist-list-resolver.service';

describe('ArtistListResolverService', () => {
  let service: ArtistListResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ArtistListResolverService,
        {
          provide: ArtistStateService,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(ArtistListResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
