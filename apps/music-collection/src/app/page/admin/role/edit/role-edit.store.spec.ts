import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Role } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxRolesService } from 'ngx-permissions';

import { ROLE_NAME_TAKEN, RoleEffect } from '../../../../data/role';
import { RoleEditStore } from './role-edit.store';

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
	create$: jest.Mock;
	update$: jest.Mock;
	countHolders$: jest.Mock;
}

function setUp(
	options: {
		myRoles?: string[];
		overrides?: Partial<FakeEffect>;
	} = {}
): {
	effect: FakeEffect;
	router: { navigate: jest.Mock };
	store: InstanceType<typeof RoleEditStore>;
} {
	const effect: FakeEffect = {
		roles$: of(CATALOG),
		create$: jest.fn((draft) => of(role('NEW', draft.name))),
		update$: jest.fn((uid: string) => of(role(uid, 'EDITOR'))),
		countHolders$: jest.fn(() => of(4)),
		...options.overrides,
	};
	const router = { navigate: jest.fn() };

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			RoleEditStore,
			{ provide: RoleEffect, useValue: effect },
			{ provide: Router, useValue: router },
			{
				provide: NgxRolesService,
				useValue: {
					getRoles: () =>
						Object.fromEntries(
							(options.myRoles ?? ['ADMIN']).map((name) => [
								name,
								{},
							])
						),
				},
			},
		],
	});

	const store = TestBed.inject(RoleEditStore);

	return { effect, router, store };
}

const open = (
	store: InstanceType<typeof RoleEditStore>,
	target: { uid: string | null; from?: string | null }
) => {
	store.open({ from: null, ...target });
	// The holder count follows the role through a signal, which reaches its
	// reader only once effects run.
	TestBed.tick();
};

beforeEach(() =>
	jest.spyOn(console, 'error').mockImplementation(() => undefined)
);

describe('RoleEditStore, opening', () => {
	it('fills the draft from the role it was opened on', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });

		expect(store.draft().name).toBe('EDITOR');
		expect(store.draft().permissions).toEqual([
			'createAlbumEntity',
			'updateAlbumEntity',
		]);
	});

	it('opens empty for a new role', () => {
		const { store } = setUp();

		open(store, { uid: null });

		expect(store.draft().name).toBe('');
		expect(store.draft().permissions).toEqual([]);
		expect(store.original()).toBeNull();
	});

	/**
	 * A copy takes the permissions and leaves the name: two roles answering
	 * to one name is the thing the permission sync cannot tell apart.
	 */
	it('copies the permissions of another role but never its name', () => {
		const { store } = setUp();

		open(store, { uid: null, from: 'EDITOR' });

		expect(store.draft().name).toBe('');
		expect(store.draft().permissions).toEqual([
			'createAlbumEntity',
			'updateAlbumEntity',
		]);
	});

	/**
	 * The dashboard's quick action links to `edit/0`. Opening that must not
	 * end in a role document called `0`.
	 */
	it('treats a route that names no role as a new one', () => {
		const { store, effect } = setUp();

		open(store, { uid: '0' });
		store.setName('Reviewer');
		store.toggle({ permissions: ['createAlbumEntity'], granted: true });
		store.save();

		expect(store.target().uid).toBeNull();
		expect(effect.update$).not.toHaveBeenCalled();
		expect(effect.create$).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Reviewer' })
		);
	});

	it('asks how many users the role reaches', () => {
		const { store, effect } = setUp();

		open(store, { uid: 'EDITOR' });

		expect(effect.countHolders$).toHaveBeenCalled();
		expect(store.holders()).toBe(4);
	});
});

describe('RoleEditStore, the draft', () => {
	it('grants a whole row in one move', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });
		store.toggle({
			permissions: ['createArtistEntity', 'updateArtistEntity'],
			granted: true,
		});

		expect(store.draft().permissions).toEqual([
			'createAlbumEntity',
			'createArtistEntity',
			'updateAlbumEntity',
			'updateArtistEntity',
		]);
	});

	it('says what the save would add and take away', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });
		store.toggle({ permissions: ['createAlbumEntity'], granted: false });
		store.toggle({ permissions: ['deleteAlbumEntity'], granted: true });

		expect(store.diff()).toEqual({
			added: ['deleteAlbumEntity'],
			removed: ['createAlbumEntity'],
		});
	});

	it('narrows the grid to what the search matches', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });
		store.setSearch('Admin pages');

		expect(store.visibleGroups()).toHaveLength(1);
	});

	it('keeps a permission the catalog does not know, and offers to drop it', () => {
		const { store } = setUp({
			overrides: {
				roles$: of([role('LEGACY', 'LEGACY', ['viewSomethingGone'])]),
			},
		});

		open(store, { uid: 'LEGACY' });

		expect(store.extraPermissions()).toEqual(['viewSomethingGone']);

		store.toggle({ permissions: ['viewSomethingGone'], granted: false });

		expect(store.extraPermissions()).toEqual([]);
	});
});

describe('RoleEditStore, saving', () => {
	it('refuses a draft that would change nothing', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });

		expect(store.canSave()).toBe(false);
	});

	it('allows a save that only changes the description', () => {
		const { store } = setUp();

		open(store, { uid: 'EDITOR' });
		store.setDescription('Edits the catalog');

		expect(store.canSave()).toBe(true);
	});

	it('writes the draft and goes back to the list', () => {
		const { store, effect, router } = setUp();

		open(store, { uid: 'EDITOR' });
		store.toggle({ permissions: ['deleteAlbumEntity'], granted: true });
		store.save();

		expect(effect.update$).toHaveBeenCalledWith(
			'EDITOR',
			expect.objectContaining({ name: 'EDITOR' })
		);
		expect(router.navigate).toHaveBeenCalledWith(['/admin/role']);
	});

	/**
	 * The refusal that matters: an admin emptying the very role that lets
	 * them open these pages has no way back inside the app.
	 */
	it('refuses a save that would take my own access away', () => {
		const { store, effect } = setUp({ myRoles: ['ADMIN'] });

		open(store, { uid: 'ADMIN' });
		store.toggle({ permissions: ['ADMIN'], granted: false });

		expect(store.canSave()).toBe(false);

		store.save();

		expect(effect.update$).not.toHaveBeenCalled();
	});

	it('stays on the page and says so when the name was taken meanwhile', () => {
		const { store, router } = setUp({
			overrides: {
				create$: jest.fn(() =>
					throwError(() => new Error(ROLE_NAME_TAKEN))
				),
			},
		});

		open(store, { uid: null });
		store.setName('Reviewer');
		store.toggle({ permissions: ['createAlbumEntity'], granted: true });
		store.save();

		expect(store.error()).toBe(ROLE_NAME_TAKEN);
		expect(router.navigate).not.toHaveBeenCalled();
	});
});
