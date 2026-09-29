import { Role, User } from '@music-collection/api';

import { keepsAccess } from '../role';
import {
	danglingReferences,
	heldRoles,
	holdsRole,
	permissionsOf,
	roleReferences,
	userName,
	withRole,
} from './user-role.adapter';

const role = (uid: string, name: string, permissions: string[] = []): Role => ({
	name,
	permissions,
	uid,
});

const CATALOG = [
	role('USER', 'USER', ['createCollectionItemEntity']),
	role('ADMIN_ROLE', 'ADMIN', ['ADMIN']),
	role('EDITOR', 'Szerkesztő', ['createAlbumEntity', 'updateAlbumEntity']),
];

const user = (fields: Partial<User>): User =>
	({ uid: 'collector-1', ...fields }) as User;

describe('roleReferences', () => {
	it('reads the ids of the user document', () => {
		expect([...roleReferences(user({ roleIds: ['USER'] }))]).toEqual([
			'USER',
		]);
	});

	/**
	 * The permission sync accepts both spellings, so the page has to see both
	 * — a role shown as removed while the embedded copy still names it would
	 * be a lie about what the user can do.
	 */
	it('reads the legacy embedded roles by uid and by name', () => {
		const references = roleReferences(
			user({ roles: [role('ADMIN_ROLE', 'ADMIN')] })
		);

		expect([...references].sort()).toEqual(['ADMIN', 'ADMIN_ROLE']);
	});
});

describe('heldRoles', () => {
	it('matches a reference against the id or the name', () => {
		const held = heldRoles(user({ roleIds: ['Szerkesztő'] }), CATALOG);

		expect(held.map(({ uid }) => uid)).toEqual(['EDITOR']);
	});
});

describe('danglingReferences', () => {
	it('names what points at no role at all', () => {
		expect(
			danglingReferences(user({ roleIds: ['USER', 'GONE'] }), CATALOG)
		).toEqual(['GONE']);
	});
});

describe('permissionsOf', () => {
	it('unites the permissions of the roles, once each', () => {
		expect(permissionsOf([CATALOG[0], CATALOG[2]])).toEqual([
			'createAlbumEntity',
			'createCollectionItemEntity',
			'updateAlbumEntity',
		]);
	});
});

describe('keepsAccess', () => {
	it('lets the wildcard through', () => {
		expect(keepsAccess(['ADMIN'])).toBe(true);
	});

	it('lets a plain user manager through', () => {
		expect(keepsAccess(['updateUserEntity'])).toBe(true);
	});

	it('refuses a set that could not put a role back', () => {
		expect(keepsAccess(['createAlbumEntity'])).toBe(false);
		expect(keepsAccess([])).toBe(false);
	});
});

describe('withRole', () => {
	/**
	 * A role given by name and taken back by id would stay: the sync reads
	 * both spellings, so both have to go and only one may come back.
	 */
	it('takes a role away whichever way the document names it', () => {
		expect(withRole(['Szerkesztő', 'USER'], CATALOG[2], false)).toEqual([
			'USER',
		]);
		expect(withRole(['EDITOR', 'USER'], CATALOG[2], false)).toEqual([
			'USER',
		]);
	});

	it('hands a role over by its document id', () => {
		expect(withRole(['USER'], CATALOG[1], true)).toEqual([
			'ADMIN_ROLE',
			'USER',
		]);
	});

	it('never writes the same role twice', () => {
		expect(withRole(['EDITOR', 'Szerkesztő'], CATALOG[2], true)).toEqual([
			'EDITOR',
		]);
	});
});

describe('holdsRole', () => {
	it('is true for either spelling', () => {
		expect(holdsRole(['Szerkesztő'], CATALOG[2])).toBe(true);
		expect(holdsRole(['EDITOR'], CATALOG[2])).toBe(true);
		expect(holdsRole(['USER'], CATALOG[2])).toBe(false);
	});
});

describe('userName', () => {
	it('falls back from name to email to uid', () => {
		expect(userName(user({ displayName: 'Zsolt' }))).toBe('Zsolt');
		expect(userName(user({ email: 'zs@example.com' }))).toBe(
			'zs@example.com'
		);
		expect(userName(user({ uid: 'collector-1' }))).toBe('collector-1');
	});
});
