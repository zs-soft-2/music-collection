import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { DocumentListService } from './document-list.service';

describe('DocumentListService', () => {
	let service: DocumentListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), DocumentListService],
		});

		service = TestBed.inject(DocumentListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
