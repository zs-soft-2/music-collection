import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseListService } from './release-list.service';

describe('ReleaseListService', () => {
	let service: ReleaseListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ReleaseListService,
				{ provide: ReleaseStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ReleaseListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
