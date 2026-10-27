import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { Observable, Subscriber } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Auth, authState } from '@angular/fire/auth';

import { AuthenticatedUserService } from './authenticated-user.service';

jest.mock('@angular/fire/auth', () => ({
	...jest.requireActual('@angular/fire/auth'),
	authState: jest.fn(),
}));

describe('AuthenticatedUserService', () => {
	/** How many times the auth SDK was actually listened to. */
	let asked: number;
	let sdk: Subscriber<unknown> | undefined;

	const service = () => TestBed.inject(AuthenticatedUserService);

	beforeEach(() => {
		asked = 0;
		sdk = undefined;

		(authState as jest.Mock).mockImplementation(
			() =>
				new Observable((subscriber) => {
					asked++;
					sdk = subscriber;
				})
		);

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				AuthenticatedUserService,
				{ provide: Auth, useValue: { currentUser: null } },
			],
		});
	});

	it('asks the auth SDK once however many follow the session', () => {
		const user = service();

		user.user$.subscribe();
		user.user$.subscribe();
		user.user$.subscribe();

		expect(asked).toBe(1);
	});

	it('says nothing until the session is known', () => {
		let emitted = false;

		service().user$.subscribe(() => (emitted = true));

		// Firebase restores the session asynchronously: until it has, nobody
		// is signed in or out, and a reader must not be told either.
		expect(emitted).toBe(false);
	});

	it('hands the known session to whoever asks later', () => {
		const user = service();
		const seen: unknown[] = [];

		const first = user.user$.subscribe();
		sdk?.next({ uid: 'u1' });
		first.unsubscribe();

		user.user$.subscribe((value) => seen.push(value));

		// The last reader let go, but the session outlives them: the next one
		// reads it at once instead of waiting for the SDK all over again.
		expect(asked).toBe(1);
		expect(seen).toEqual([{ uid: 'u1' }]);
	});
});
