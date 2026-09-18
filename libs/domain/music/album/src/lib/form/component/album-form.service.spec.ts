import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';

import { AlbumFormService } from './album-form.service';

describe('AlbumFormService', () => {
	let service: AlbumFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AlbumFormService,
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{ provide: AlbumUtilService, useValue: {} },
				{
					provide: ArtistStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		});

		service = TestBed.inject(AlbumFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
