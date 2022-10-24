import { TestBed } from '@angular/core/testing';

import { ArtistEditResolverService } from './artist-edit-resolver.service';

describe('ArtistEditResolverService', () => {
  let service: ArtistEditResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArtistEditResolverService],
    });

    service = TestBed.inject(ArtistEditResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
