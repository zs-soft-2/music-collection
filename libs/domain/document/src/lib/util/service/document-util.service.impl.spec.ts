import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { DocumentUtilServiceImpl } from './document-util.service.impl';

describe('DocumentUtilServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), DocumentUtilServiceImpl],
		})
	);

	it('should be created', () => {
		const service: DocumentUtilServiceImpl = TestBed.inject(
			DocumentUtilServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
