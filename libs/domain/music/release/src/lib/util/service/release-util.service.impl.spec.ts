import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { ReleaseUtilServiceImpl } from './release-util.service.impl';

describe('ReleaseUtilServiceImpl', () => {
	let service: ReleaseUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), ReleaseUtilServiceImpl],
		});
		service = TestBed.inject(ReleaseUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
