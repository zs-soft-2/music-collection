import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	AuthorizationService,
} from '@music-collection/api';

import { TopBarService } from './top-bar.service';

describe('TopBarService', () => {
	let service: TopBarService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				TopBarService,
				{
					provide: AuthenticationStateService,
					useValue: {
						dispatchLogin: jest.fn(),
						dispatchLogout: jest.fn(),
						selectAuthenticatedUser$: () => of(undefined),
						selectIsAuthenticated$: () => of(false),
					},
				},
				{
					provide: AuthorizationService,
					useValue: { removeAll: jest.fn() },
				},
			],
		});
		service = TestBed.inject(TopBarService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
