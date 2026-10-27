import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { DocumentStateService } from '@music-collection/api';

import { DocumentEditResolverService } from './document-edit-resolver.service';

describe('DocumentEditResolverService', () => {
	let service: DocumentEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				DocumentEditResolverService,
				{ provide: DocumentStateService, useValue: {} },
			],
		});

		service = TestBed.inject(DocumentEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
