import { TestBed } from '@angular/core/testing';

import { MCAlbumHookService } from './mc-album-hook.service';

describe('MCAlbumHookService', () => {
	let service: MCAlbumHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(MCAlbumHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
