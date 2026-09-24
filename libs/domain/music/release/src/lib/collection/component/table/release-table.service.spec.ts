import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReleaseStateService, ReleaseUtilService } from '@music-collection/api';

import { ReleaseTableService } from './release-table.service';

describe('ReleaseTableService', () => {
	let service: ReleaseTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ReleaseTableService,
				provideRouter([]),
				{ provide: ReleaseStateService, useValue: {} },
				{ provide: ReleaseUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(ReleaseTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
