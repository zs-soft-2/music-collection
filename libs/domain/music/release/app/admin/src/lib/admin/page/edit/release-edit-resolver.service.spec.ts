import { TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseEditResolverService } from './release-edit-resolver.service';

describe('ReleaseEditResolverService', () => {
	let service: ReleaseEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
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
