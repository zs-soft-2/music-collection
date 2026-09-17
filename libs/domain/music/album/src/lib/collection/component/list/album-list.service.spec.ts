import { TestBed } from '@angular/core/testing';
import { AlbumStateService } from '@music-collection/api';

import { AlbumListService } from './album-list.service';

describe('AlbumListService', () => {
	let service: AlbumListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AlbumListService,
				{ provide: AlbumStateService, useValue: {} },
			],
		});

		service = TestBed.inject(AlbumListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
