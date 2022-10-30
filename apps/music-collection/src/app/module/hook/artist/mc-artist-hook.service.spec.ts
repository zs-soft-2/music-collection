import { TestBed } from '@angular/core/testing';

import { MCArtistHookService } from './mc-artist-hook.service';

describe('MCArtistHookService', () => {
	let service: MCArtistHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(MCArtistHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
