import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistListService } from './artist-list.service';

describe('ArtistListService', () => {
	let service: ArtistListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ArtistListService,
				{ provide: ArtistStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ArtistListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
