import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { AuthenticationStateServiceImpl } from './authentication-state.service.impl';

describe('AuthenticationStateServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [provideMockStore(), AuthenticationStateServiceImpl],
		})
	);

	it('should be created', () => {
		const service: AuthenticationStateServiceImpl = TestBed.inject(
			AuthenticationStateServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
