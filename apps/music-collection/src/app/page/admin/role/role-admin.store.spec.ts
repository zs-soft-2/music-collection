import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Role } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { ROLE_IN_USE, RoleEffect, RoleInUseError } from '../../../data/role';
import { RoleAdminStore } from './role-admin.store';

const role = (uid: string, name: string, permissions: string[] = []): Role => ({
	name,
	permissions,
	uid,
});

const CATALOG = [
	role('ADMIN', 'ADMIN', ['ADMIN']),
	role('EDITOR', 'EDITOR', ['createAlbumEntity', 'updateAlbumEntity']),
];

interface FakeEffect {
	roles$: ReturnType<typeof of<Role[]>>;
	delete$: jest.Mock;
	countHolders$: jest.Mock;
}

function setUp(
	overrides: Partial<FakeEffect> = {}
): { effect: FakeEffect; store: InstanceType<typeof RoleAdminStore> } {
	const effect: FakeEffect = {
		roles$: of(CATALOG),
		delete$: jest.fn(() => of(undefined)),
		countHolders$: jest.fn(() => of(0)),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			RoleAdminStore,
			{ provide: RoleEffect, useValue: effect },
		],
	});

	const store = TestBed.inject(RoleAdminStore);

	// The holder counts follow the role list through a signal, and a signal
	// only reaches its reader when effects run. In the application that is
	// change detection; here it has to be asked for.
	TestBed.tick();

	return { effect, store };
}

beforeEach(() =>
	jest.spyOn(console, 'error').mockImplementation(() => undefined)
);

describe('RoleAdminStore', () => {
	it('reads the roles when it opens', () => {
		const { store } = setUp();

		expect(store.rows()).toHaveLength(2);
		expect(store.isLoading()).toBe(false);
	});

	/**
	 * A count of permissions says nothing an admin can act on; how far the
	 * role reaches into each part of the collection does.
	 */
	it('sums each role up group by group', () => {
		const { store } = setUp();
		const editor = store
			.rows()
			.find((row) => row.role.uid === 'EDITOR');

		expect(
			editor?.coverage.find(
				(line) => line.groupKey === 'admin.role.group.catalog'
			)?.granted
		).toBe(2);
	});

	it('marks the role that carries the wildcard', () => {
		const { store } = setUp();

		expect(
			store.rows().find((row) => row.role.uid === 'ADMIN')?.isWildcard
		).toBe(true);
	});

	it('asks the server how many users hold each role', () => {
		const { store, effect } = setUp({
			countHolders$: jest.fn((role: Role) =>
				of(role.uid === 'ADMIN' ? 1 : 0)
			),
		});

		expect(effect.countHolders$).toHaveBeenCalledTimes(2);
		expect(
			store.rows().find((row) => row.role.uid === 'ADMIN')?.holders
		).toBe(1);
	});

	/**
	 * Null, not zero: "nobody holds it" and "I was not allowed to ask" lead
	 * to opposite decisions about the delete button.
	 */
	it('leaves the count unknown when the query is refused', () => {
		const { store } = setUp({ countHolders$: jest.fn(() => of(null)) });

		expect(store.rows()[0].holders).toBeNull();
	});

	it('reports a role taken in the meantime as in use', () => {
		const { store } = setUp({
			delete$: jest.fn(() => throwError(() => new RoleInUseError(2))),
		});

		store.askDeletion(CATALOG[1]);
		store.confirmDeletion();

		expect(store.error()).toBe(ROLE_IN_USE);
		expect(store.pendingHolders()).toBe(2);
	});

	it('closes the confirmation once the role is gone', () => {
		const { store, effect } = setUp();

		store.askDeletion(CATALOG[1]);
		store.confirmDeletion();

		expect(effect.delete$).toHaveBeenCalledWith(CATALOG[1]);
		expect(store.pendingDeletion()).toBeNull();
	});
});
