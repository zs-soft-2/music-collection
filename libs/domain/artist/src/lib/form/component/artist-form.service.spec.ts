import { TestBed } from '@angular/core/testing';

import { ArtistFormService } from './product-form.service';

describe('ArtistFormService', () => {
  let service: ArtistFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArtistFormService],
    });

    service = TestBed.inject(ArtistFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
