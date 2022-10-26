import { TestBed } from '@angular/core/testing';

import { AuthenticationStateServiceImpl } from './authentication-state.service.impl';

describe('AuthenticationStateServiceImpl', () => {
	beforeEach(() => TestBed.configureTestingModule({}));

	it('should be created', () => {
		const service: AuthenticationStateServiceImpl = TestBed.inject(
			AuthenticationStateServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
