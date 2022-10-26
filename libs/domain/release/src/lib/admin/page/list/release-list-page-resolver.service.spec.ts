import { TestBed } from '@angular/core/testing';
import { ReleaseStateService } from '@music-collection/api';

import { ReleaseListPageResolverService } from './release-list-page-resolver.service';

describe('ReleaseListPageResolverService', () => {
	let service: ReleaseListPageResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ReleaseListPageResolverService,
				{
					provide: ReleaseStateService,
					useValue: {},
				},
			],
		});
		service = TestBed.inject(ReleaseListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
