import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	ExportImportService,
} from '@music-collection/api';

import { ArtistTableService } from './artist-table.service';

describe('ArtistTableService', () => {
	let service: ArtistTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ArtistTableService,
				provideRouter([]),
				{ provide: ArtistStateService, useValue: {} },
				{ provide: ArtistUtilService, useValue: {} },
				{ provide: ExportImportService, useValue: {} },
			],
		});

		service = TestBed.inject(ArtistTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
