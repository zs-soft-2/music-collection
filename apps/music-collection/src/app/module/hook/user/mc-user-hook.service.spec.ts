import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MCUserHookService } from './mc-user-hook.service';

describe('mcUserHookService', () => {
	let service: MCUserHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), MCUserHookService],
		});
		service = TestBed.inject(MCUserHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
