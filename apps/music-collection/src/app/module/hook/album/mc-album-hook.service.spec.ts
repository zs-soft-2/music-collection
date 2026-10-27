import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCAlbumHookService } from './mc-album-hook.service';

describe('MCAlbumHookService', () => {
	let service: MCAlbumHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				MCAlbumHookService,
			],
		});

		service = TestBed.inject(MCAlbumHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
