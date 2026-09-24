import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCUserHookService } from './mc-user-hook.service';

describe('mcUserHookService', () => {
	let service: MCUserHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				MCUserHookService,
			],
		});
		service = TestBed.inject(MCUserHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
