import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumListService } from './album-list.service';

describe('AlbumListService', () => {
	let service: AlbumListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				AlbumListService,
				{ provide: AlbumStateService, useValue: {} },
			],
		});

		service = TestBed.inject(AlbumListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
