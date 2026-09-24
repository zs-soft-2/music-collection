import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { LabelUtilServiceImpl } from './label-util.service.impl';

describe('LabelUtilServiceImpl', () => {
	let service: LabelUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), LabelUtilServiceImpl],
		});
		service = TestBed.inject(LabelUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
