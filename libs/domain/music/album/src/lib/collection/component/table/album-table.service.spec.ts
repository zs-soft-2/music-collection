import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
} from '@music-collection/api';

import { AlbumTableService } from './album-table.service';

describe('AlbumTableService', () => {
	let service: AlbumTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				AlbumTableService,
				provideRouter([]),
				{ provide: AlbumStateService, useValue: {} },
				{ provide: AlbumUtilService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
			],
		});

		service = TestBed.inject(AlbumTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
