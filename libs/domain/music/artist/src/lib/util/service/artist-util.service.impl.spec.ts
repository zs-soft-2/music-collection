import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { ArtistUtilServiceImpl } from './artist-util.service.impl';

describe('ArtistUtilServiceImpl', () => {
	let service: ArtistUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), ArtistUtilServiceImpl],
		});
		service = TestBed.inject(ArtistUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
