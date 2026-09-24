import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { AlbumUtilServiceImpl } from './album-util.service.impl';

describe('AlbumUtilServiceImpl', () => {
	let service: AlbumUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), AlbumUtilServiceImpl],
		});
		service = TestBed.inject(AlbumUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
