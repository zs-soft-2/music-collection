import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
} from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';

describe('ArtistFormService', () => {
	let service: ArtistFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ArtistFormService,
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
					},
				},
				{ provide: ArtistUtilService, useValue: {} },
				{ provide: DocumentStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ArtistFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
