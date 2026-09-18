import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseTableService } from './release-table.service';

describe('ReleaseTableService', () => {
	let service: ReleaseTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
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
