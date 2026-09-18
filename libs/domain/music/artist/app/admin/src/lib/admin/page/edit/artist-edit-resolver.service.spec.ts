import { TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistEditResolverService } from './artist-edit-resolver.service';

describe('ArtistEditResolverService', () => {
	let service: ArtistEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ArtistEditResolverService,
				{ provide: ArtistStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ArtistEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
