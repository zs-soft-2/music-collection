import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AuthenticationStateService,
	Role,
	User,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { RoleEffect } from '../../../data/role';
import { UserRoleEffect } from '../../../data/user-role';
import { UserAdminStore, WOULD_LOCK_OUT } from './user-admin.store';

const role = (uid: string, name: string, permissions: string[] = []): Role => ({
	name,
	permissions,
	uid,
});

const CATALOG = [
	role('ADMIN', 'ADMIN', ['ADMIN']),
	role('EDITOR', 'EDITOR', ['createAlbumEntity']),
	role('USER', 'USER', ['createCollectionItemEntity']),
];

const user = (fields: Partial<User>): User => ({ uid: 'u', ...fields }) as User;

const ME = user({
	uid: 'admin-1',
	displayName: 'Zsolt',
	email: 'zs@example.com',
	roleIds: ['ADMIN'],
});
const COLLECTOR = user({
	uid: 'collector-1',
	displayName: 'A Collector',
	email: 'collector@example.com',
	roleIds: ['USER', 'GONE'],
});

interface FakeUserEffect {
	users$: ReturnType<typeof of<User[]>>;
	assign$: jest.Mock;
	effectivePermissions$: jest.Mock;
	resync$: jest.Mock;
}

function setUp(
	options: { users?: User[]; me?: string | null } = {}
): { userEffect: FakeUserEffect; store: InstanceType<typeof UserAdminStore> } {
	const userEffect: FakeUserEffect = {
		users$: of(options.users ?? [ME, COLLECTOR]),
		assign$: jest.fn(() => of(undefined)),
		effectivePermissions$: jest.fn(() =>
			of({ permissions: ['ADMIN'], roles: ['ADMIN'] })
		),
		resync$: jest.fn(() => of({ users: 2, changed: 1 })),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			UserAdminStore,
			{ provide: RoleEffect, useValue: { roles$: of(CATALOG) } },
			{ provide: UserRoleEffect, useValue: userEffect },
			{
				provide: AuthenticationStateService,
				useValue: {
					selectAuthenticatedUser$: () =>
						of(
							options.me === null
								? undefined
								: { uid: options.me ?? ME.uid }
						),
				},
			},
		],
	});

	return { userEffect, store: TestBed.inject(UserAdminStore) };
}

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));

describe('UserAdminStore', () => {
	it('lists the users with the roles they hold', () => {
		const { store } = setUp();
		const collector = store
			.rows()
			.find((row) => row.user.uid === COLLECTOR.uid);

		expect(collector?.roles.map(({ uid }) => uid)).toEqual(['USER']);
	});

	/** A reference left over from a deleted role grants nothing; it is shown. */
	it('names a reference that points at no role', () => {
		const { store } = setUp();

		expect(
			store.rows().find((row) => row.user.uid === COLLECTOR.uid)?.dangling
		).toEqual(['GONE']);
	});

	it('narrows the list by name, email or id', () => {
		const { store } = setUp();

		store.setSearch('collector@');

		expect(store.rows()).toHaveLength(1);
		expect(store.rows()[0].user.uid).toBe(COLLECTOR.uid);
	});

	it('writes the role by its document id', () => {
		const { store, userEffect } = setUp();

		store.edit(COLLECTOR);
		store.toggleRole(CATALOG[1], true);
		store.save();

		expect(userEffect.assign$).toHaveBeenCalledWith(COLLECTOR.uid, [
			'EDITOR',
			'GONE',
			'USER',
		]);
	});

	it('takes a role away by either spelling', () => {
		const { store, userEffect } = setUp({
			users: [user({ uid: 'x', roleIds: ['USER'], displayName: 'X' })],
		});

		store.edit(store.rows()[0].user);
		store.toggleRole(CATALOG[2], false);
		store.save();

		expect(userEffect.assign$).toHaveBeenCalledWith('x', []);
	});

	/**
	 * The one save the page refuses. Everything else here can be undone from
	 * here; this one takes away the page itself.
	 */
	it('refuses to take my own access away', () => {
		const { store, userEffect } = setUp({ me: ME.uid });

		store.edit(ME);
		store.toggleRole(CATALOG[0], false);

		expect(store.keepsMyAccess()).toBe(false);

		store.save();

		expect(userEffect.assign$).not.toHaveBeenCalled();
		expect(store.error()).toBe(WOULD_LOCK_OUT);
	});

	it('lets me take a role away from somebody else', () => {
		const { store } = setUp({ me: ME.uid });

		store.edit(COLLECTOR);
		store.toggleRole(CATALOG[2], false);

		expect(store.keepsMyAccess()).toBe(true);
	});

	it('reads the effective permissions of one user on demand', () => {
		const { store, userEffect } = setUp();

		store.open(COLLECTOR.uid);

		expect(userEffect.effectivePermissions$).toHaveBeenCalledWith(
			COLLECTOR.uid
		);
		expect(store.effective()?.permissions).toEqual(['ADMIN']);
	});

	it('reports what a recompute touched', () => {
		const { store } = setUp();

		store.resync();

		expect(store.resynced()).toEqual({ users: 2, changed: 1 });
	});
});

describe('UserAdminStore, narrowing by role', () => {
	/** The role page links here to answer "who holds this one?". */
	it('keeps only the users who hold the role', () => {
		const { store } = setUp();

		store.setRoleFilter('USER');

		expect(store.rows().map((row) => row.user.uid)).toEqual([
			COLLECTOR.uid,
		]);
		expect(store.filteredRole()?.name).toBe('USER');
	});

	it('lets the filter go again', () => {
		const { store } = setUp();

		store.setRoleFilter('USER');
		store.setRoleFilter(null);

		expect(store.rows()).toHaveLength(2);
	});

	it('narrows by search and role together', () => {
		const { store } = setUp();

		store.setRoleFilter('USER');
		store.setSearch('Zsolt');

		expect(store.rows()).toHaveLength(0);
	});
});

describe('UserAdminStore.holds', () => {
	it('answers for either spelling of a reference', () => {
		const { store } = setUp();

		store.edit(COLLECTOR);

		expect(store.holds(CATALOG[2])).toBe(true);
		expect(store.holds(CATALOG[1])).toBe(false);
	});
});
