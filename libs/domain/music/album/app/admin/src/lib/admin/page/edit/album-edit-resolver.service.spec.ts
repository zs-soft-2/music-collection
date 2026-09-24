import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumEditResolverService } from './album-edit-resolver.service';

describe('AlbumEditResolverService', () => {
	let service: AlbumEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
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
