import { TestBed } from '@angular/core/testing';

import { AlbumEditResolverService } from './album-edit-resolver.service';

describe('AlbumEditResolverService', () => {
	let service: AlbumEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [AlbumEditResolverService],
		});

		service = TestBed.inject(AlbumEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
