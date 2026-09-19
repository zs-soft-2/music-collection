import { BehaviorSubject, Subject, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AuthenticationStateService,
	AuthorizationService,
	EffectivePermissions,
	EffectivePermissionsDataService,
	User,
} from '@music-collection/api';

import { AuthorizationEffects } from './authorization.effects';

describe('AuthorizationEffects', () => {
	let authenticatedUser$: BehaviorSubject<User | undefined>;
	let effective$: Subject<EffectivePermissions | undefined>;
	let authorizationService: {
		addPermission: jest.Mock;
		addRole: jest.Mock;
		removeAll: jest.Mock;
	};
	let load: jest.Mock;

	const user = (uid: string) => ({ uid }) as User;

	function create(): AuthorizationEffects {
		return TestBed.inject(AuthorizationEffects);
	}

	beforeEach(() => {
		authenticatedUser$ = new BehaviorSubject<User | undefined>(undefined);
		effective$ = new Subject<EffectivePermissions | undefined>();
		authorizationService = {
			addPermission: jest.fn(),
			addRole: jest.fn(),
			removeAll: jest.fn(),
		};
		load = jest.fn().mockReturnValue(effective$);

		TestBed.configureTestingModule({
			providers: [
				AuthorizationEffects,
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => authenticatedUser$,
					},
				},
				{ provide: AuthorizationService, useValue: authorizationService },
				{
					provide: EffectivePermissionsDataService,
					useValue: { load$: load },
				},
			],
		});
	});

	it('bejelentkezés nélkül nem kér le jogosultságot', () => {
		create();

		expect(load).not.toHaveBeenCalled();
	});

	it('a bejelentkezett user dokumentumából tölti a permissionöket', () => {
		create();
		authenticatedUser$.next(user('u1'));
		effective$.next({
			permissions: ['ADMIN', 'createMusicianEntity'],
			roles: ['ADMIN'],
		});

		expect(load).toHaveBeenCalledWith('u1');
		expect(authorizationService.addPermission).toHaveBeenCalledWith('ADMIN');
		expect(authorizationService.addPermission).toHaveBeenCalledWith(
			'createMusicianEntity'
		);
		expect(authorizationService.addRole).toHaveBeenCalledWith({
			uid: 'ADMIN',
			name: 'ADMIN',
			permissions: [],
		});
	});

	it('minden frissítésnél tiszta lappal indul', () => {
		create();
		// Induláskor (még bejelentkezés nélkül) egyszer már ürített.
		authorizationService.removeAll.mockClear();
		authenticatedUser$.next(user('u1'));
		effective$.next({ permissions: ['ADMIN'], roles: ['ADMIN'] });
		effective$.next({ permissions: [], roles: [] });

		expect(authorizationService.removeAll).toHaveBeenCalledTimes(2);
		expect(authorizationService.addPermission).toHaveBeenCalledTimes(1);
	});

	it('kijelentkezéskor mindent kiürít', () => {
		create();
		authenticatedUser$.next(user('u1'));
		effective$.next({ permissions: ['ADMIN'], roles: ['ADMIN'] });
		authorizationService.removeAll.mockClear();
		authenticatedUser$.next(undefined);

		expect(authorizationService.removeAll).toHaveBeenCalledTimes(1);
		expect(authorizationService.addPermission).toHaveBeenCalledTimes(1);
	});

	it('hiányzó dokumentum esetén nincs permission', () => {
		create();
		authenticatedUser$.next(user('u1'));
		effective$.next(undefined);

		expect(authorizationService.removeAll).toHaveBeenCalled();
		expect(authorizationService.addPermission).not.toHaveBeenCalled();
	});

	it('tiltott olvasás esetén sem dől el, csak nincs permission', () => {
		load.mockReturnValue(
			throwError(() => new Error('Missing or insufficient permissions.'))
		);
		create();
		authenticatedUser$.next(user('u1'));

		expect(authorizationService.removeAll).toHaveBeenCalled();
		expect(authorizationService.addPermission).not.toHaveBeenCalled();
	});
	it('appliedFor$ csak a user jogosultságainak betöltése után emittál', () => {
		const effects = create();
		const ready = jest.fn();
		effects.appliedFor$('u1').subscribe(ready);

		authenticatedUser$.next(user('u1'));
		expect(ready).not.toHaveBeenCalled();

		effective$.next({ permissions: ['ADMIN'], roles: ['ADMIN'] });
		expect(ready).toHaveBeenCalledTimes(1);
		expect(authorizationService.addRole).toHaveBeenCalled();
	});
});
