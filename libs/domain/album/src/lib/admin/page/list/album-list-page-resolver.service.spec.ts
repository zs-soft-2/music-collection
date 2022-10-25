import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumListPageResolverService } from './album-list-page-resolver.service';

describe('AlbumListPageResolverService', () => {
  let service: AlbumListPageResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AlbumListPageResolverService,
        {
          provide: AlbumStateService,
          useValue: {},
        },
      ],
    });
    service = TestBed.inject(AlbumListPageResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
