import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { AuthenticationStateServiceImpl } from './authentication-state.service.impl';

describe('AuthenticationStateServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideMockStore(),
				AuthenticationStateServiceImpl,
			],
		})
	);

	it('should be created', () => {
		const service: AuthenticationStateServiceImpl = TestBed.inject(
			AuthenticationStateServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
