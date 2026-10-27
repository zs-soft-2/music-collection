import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCArtistHookService } from './mc-artist-hook.service';

describe('MCArtistHookService', () => {
	let service: MCArtistHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				MCArtistHookService,
			],
		});

		service = TestBed.inject(MCArtistHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
