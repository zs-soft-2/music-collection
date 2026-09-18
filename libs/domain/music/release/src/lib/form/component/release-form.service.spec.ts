import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	LabelStateService,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseFormService } from './release-form.service';

describe('ReleaseFormService', () => {
	let service: ReleaseFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ReleaseFormService,
				provideRouter([]),
				{ provide: ReleaseStateService, useValue: {} },
				{ provide: ReleaseUtilService, useValue: {} },
				{ provide: AlbumStateService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
				{ provide: LabelStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ReleaseFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
