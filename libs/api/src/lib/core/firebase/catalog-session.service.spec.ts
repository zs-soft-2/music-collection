import { Subject } from 'rxjs';

import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { AuthenticatedUserService } from './authenticated-user.service';
import { CatalogScopeService, GUEST_SCOPE_KEY } from './catalog-scope.service';
import { CatalogSessionService } from './catalog-session.service';
import { FirestoreSyncService } from './firestore-sync.service';

const HELD = 'mc-catalog-held-scope';

describe('CatalogSessionService', () => {
	let user$: Subject<{ uid: string } | null>;
	let reset: jest.Mock;
	let reload: jest.Mock;

	const start = () => {
		const service = TestBed.inject(CatalogSessionService);

		return { service, scope: TestBed.inject(CatalogScopeService) };
	};

	/** Lets the reset's promise chain run to the reload. */
	const settle = () => new Promise((resolve) => setTimeout(resolve));

	beforeEach(() => {
		localStorage.clear();
		TestBed.resetTestingModule();

		user$ = new Subject();
		reset = jest.fn().mockResolvedValue(undefined);
		reload = jest.fn();

		TestBed.configureTestingModule({
			providers: [
				{
					provide: AuthenticatedUserService,
					useValue: { user$ },
				},
				{
					provide: FirestoreSyncService,
					useValue: { resetLocalCatalog: reset },
				},
				{
					provide: DOCUMENT,
					useValue: { defaultView: { location: { reload } } },
				},
			],
		});
	});

	it('takes the cache it finds for the scope it opened in', () => {
		start();

		expect(localStorage.getItem(HELD)).toBe(GUEST_SCOPE_KEY);
		expect(reset).not.toHaveBeenCalled();
	});

	it('leaves the showcase alone for a guest', async () => {
		start();
		user$.next(null);
		await settle();

		expect(reset).not.toHaveBeenCalled();
	});

	it('throws the showcase away when a collector of one genre signs in', async () => {
		const { scope } = start();

		user$.next({ uid: 'u1' });
		// Signed in with no genre yet: still the showcase, nothing to drop.
		expect(reset).not.toHaveBeenCalled();

		scope.choose(['rock']);
		await settle();

		expect(reset).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(HELD)).toBe('rock');
	});

	it('throws the genres away when the collector signs out', async () => {
		localStorage.setItem('mc-catalog-signed-in', 'true');
		localStorage.setItem('mc-genre-scope', '{"genres":["rock"]}');
		localStorage.setItem(HELD, 'rock');
		start();

		user$.next(null);
		await settle();

		expect(reset).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(HELD)).toBe(GUEST_SCOPE_KEY);
	});

	it('keeps the cache for the whole catalog, which holds it', async () => {
		const { scope } = start();

		user$.next({ uid: 'admin' });
		scope.useWholeCatalog(true);
		await settle();

		expect(reset).not.toHaveBeenCalled();
		expect(localStorage.getItem(HELD)).toBe('');
	});

	it('resets once, however often the scope moves on the way out', async () => {
		const { service, scope } = start();

		user$.next({ uid: 'u1' });
		scope.choose(['rock']);
		scope.choose(['jazz']);
		await settle();

		expect(service.restarting).toBe(true);
		expect(reset).toHaveBeenCalledTimes(1);
	});

	it('starts again even when the reset fails, without looping', async () => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		reset.mockRejectedValue(new Error('gone'));
		const { scope } = start();

		user$.next({ uid: 'u1' });
		scope.choose(['rock']);
		await settle();

		expect(reload).toHaveBeenCalledTimes(1);
		// The next start finds the scope already recorded and does not reset.
		expect(localStorage.getItem(HELD)).toBe('rock');
	});
});
