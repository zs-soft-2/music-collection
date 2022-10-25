import { TestBed } from '@angular/core/testing';

import { AlbumTableService } from './album-table.service';

describe('AlbumTableService', () => {
  let service: AlbumTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(AlbumTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
