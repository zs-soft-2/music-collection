import { TestBed } from '@angular/core/testing';

import { ReleaseEditResolverService } from './release-edit-resolver.service';

describe('ReleaseEditResolverService', () => {
	let service: ReleaseEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ReleaseEditResolverService],
		});

		service = TestBed.inject(ReleaseEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
