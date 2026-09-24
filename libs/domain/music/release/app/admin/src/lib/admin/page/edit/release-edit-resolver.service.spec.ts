import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseEditResolverService } from './release-edit-resolver.service';

describe('ReleaseEditResolverService', () => {
	let service: ReleaseEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ReleaseEditResolverService,
				{ provide: ReleaseStateService, useValue: {} },
			],
		});

		service = TestBed.inject(ReleaseEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
