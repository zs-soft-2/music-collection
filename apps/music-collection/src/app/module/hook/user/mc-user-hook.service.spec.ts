import { TestBed } from '@angular/core/testing';

import { MCUserHookService } from './mc-user-hook.service';

describe('mcUserHookService', () => {
	let service: MCUserHookService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(MCUserHookService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
