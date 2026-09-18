import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCAlbumHookService } from './mc-album-hook.service';

describe('MCAlbumHookService', () => {
	let service: MCAlbumHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), MCAlbumHookService],
		});

		service = TestBed.inject(MCAlbumHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
