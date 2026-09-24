import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentFormService } from './document-form.service';

describe('DocumentFormService', () => {
	let service: DocumentFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				DocumentFormService,
				provideRouter([]),
				{ provide: DocumentStateService, useValue: {} },
				{ provide: DocumentUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(DocumentFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
