import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumEditResolverService } from './album-edit-resolver.service';

describe('AlbumEditResolverService', () => {
	let service: AlbumEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AlbumEditResolverService,
				{ provide: AlbumStateService, useValue: {} },
			],
		});

		service = TestBed.inject(AlbumEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
