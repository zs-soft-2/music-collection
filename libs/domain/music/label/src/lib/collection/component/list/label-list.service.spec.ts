import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { LabelListService } from './label-list.service';

describe('LabelListService', () => {
	let service: LabelListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), LabelListService],
		});

		service = TestBed.inject(LabelListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
