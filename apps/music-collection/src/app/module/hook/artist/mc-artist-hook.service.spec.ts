import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCArtistHookService } from './mc-artist-hook.service';

describe('MCArtistHookService', () => {
	let service: MCArtistHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), MCArtistHookService],
		});

		service = TestBed.inject(MCArtistHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
