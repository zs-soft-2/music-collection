import { Role, RoleDraft } from '@music-collection/api';

import {
	RoleFindingCode,
	describeRole,
	hasErrors,
	isEmptyDiff,
	keepsMyAccess,
	nameCollision,
	permissionDiff,
	searchCatalog,
	toRoleId,
	validateRole,
} from './role.engine';

const role = (uid: string, name: string, permissions: string[] = []): Role => ({
	name,
	permissions,
	uid,
});

const CATALOG = [
	role('ADMIN', 'ADMIN', ['ADMIN']),
	role('EDITOR', 'EDITOR', ['createAlbumEntity', 'updateAlbumEntity']),
	// A role whose id and name have drifted apart — a script wrote the id, an
	// admin renamed it later. It is the only way an id collision can happen
	// without the name colliding first.
	role('USER', 'Gyűjtő', ['createCollectionItemEntity']),
];

const draft = (fields: Partial<RoleDraft> = {}): RoleDraft => ({
	description: null,
	name: 'Reviewer',
	permissions: ['createAlbumEntity'],
	...fields,
});

const codes = (findings: { code: RoleFindingCode }[]) =>
	findings.map(({ code }) => code);

const validate = (
	fields: Partial<RoleDraft> = {},
	context: Partial<Parameters<typeof validateRole>[1]> = {}
) =>
	validateRole(draft(fields), {
		myRoleNames: ['ADMIN'],
		roles: CATALOG,
		uid: null,
		...context,
	});

describe('toRoleId', () => {
	it('reads like the name, so the sync matches either one', () => {
		expect(toRoleId('USER')).toBe('USER');
		expect(toRoleId('Content editor')).toBe('CONTENT_EDITOR');
	});

	it('leaves no underscore hanging at either end', () => {
		expect(toRoleId('  szerkesztő! ')).toBe('SZERKESZT');
	});
});

describe('nameCollision', () => {
	it('catches a name another role answers to, however it is cased', () => {
		expect(nameCollision('editor', { roles: CATALOG, uid: null })).toBe(
			'name-taken'
		);
	});

	it('catches a new name whose id is taken by a renamed role', () => {
		expect(nameCollision('User', { roles: CATALOG, uid: null })).toBe(
			'id-taken'
		);
	});

	it('lets a role keep its own name', () => {
		expect(nameCollision('EDITOR', { roles: CATALOG, uid: 'EDITOR' })).toBe(
			null
		);
	});
});

describe('validateRole', () => {
	it('passes a role that is new, named and grants something', () => {
		expect(validate()).toEqual([]);
	});

	it('stops a nameless role', () => {
		expect(codes(validate({ name: '  ' }))).toEqual(['name-empty']);
		expect(hasErrors(validate({ name: '' }))).toBe(true);
	});

	it('warns about a role that grants nothing', () => {
		const findings = validate({ permissions: [] });

		expect(codes(findings)).toEqual(['no-permissions']);
		expect(hasErrors(findings)).toBe(false);
	});

	/**
	 * The refusal that matters: an admin emptying the very role that lets
	 * them open these pages has no way back inside the app.
	 */
	it('stops a save that takes the editing admin own access away', () => {
		const findings = validate(
			{ name: 'ADMIN', permissions: ['createAlbumEntity'] },
			{ uid: 'ADMIN', myRoleNames: ['ADMIN'] }
		);

		expect(codes(findings)).toContain('locks-me-out');
		expect(hasErrors(findings)).toBe(true);
	});

	it('lets an admin empty a role somebody else holds', () => {
		const findings = validate(
			{ name: 'EDITOR', permissions: [] },
			{ uid: 'EDITOR', myRoleNames: ['ADMIN'] }
		);

		expect(codes(findings)).not.toContain('locks-me-out');
	});

	it('says when the wildcard makes the rest of the ticks moot', () => {
		const findings = validate({
			permissions: ['ADMIN', 'createAlbumEntity'],
		});

		expect(codes(findings)).toEqual(['wildcard-redundant']);
	});

	/** An edit page opens on a form the rules will refuse to save. */
	it('warns about an edit page the role cannot write behind', () => {
		expect(codes(validate({ permissions: ['viewAlbumEditPage'] }))).toEqual(
			['edit-page-without-write']
		);
	});

	it('is satisfied once the write permission is there too', () => {
		expect(
			codes(
				validate({
					permissions: ['viewAlbumEditPage', 'updateAlbumEntity'],
				})
			)
		).toEqual([]);
	});

	/** `user/{uid}` may be written but not listed: the page opens on nobody. */
	it('warns about a user admin who may not list the users', () => {
		expect(codes(validate({ permissions: ['updateUserEntity'] }))).toEqual([
			'user-admin-without-view',
		]);
	});

	/** Deleting a role first asks who holds it, and that is a user query. */
	it('warns about a role admin who cannot find out who holds a role', () => {
		expect(
			codes(validate({ permissions: ['deleteRoleEntity'] }))
		).toEqual(['role-delete-without-user-view']);
	});

	it('keeps quiet about all of it for the wildcard', () => {
		expect(codes(validate({ permissions: ['ADMIN'] }))).toEqual([]);
	});
});

describe('permissionDiff', () => {
	it('says what a save would add and take away', () => {
		const diff = permissionDiff(
			['createAlbumEntity', 'updateAlbumEntity'],
			['updateAlbumEntity', 'deleteAlbumEntity']
		);

		expect(diff).toEqual({
			added: ['deleteAlbumEntity'],
			removed: ['createAlbumEntity'],
		});
		expect(isEmptyDiff(diff)).toBe(false);
	});

	it('is empty when nothing moved', () => {
		expect(isEmptyDiff(permissionDiff(['a'], ['a']))).toBe(true);
	});
});

describe('describeRole', () => {
	it('sums a role up group by group', () => {
		const coverage = describeRole(['createAlbumEntity', 'updateAlbumEntity']);
		const catalog = coverage.find(
			(line) => line.groupKey === 'admin.role.group.catalog'
		);

		expect(catalog?.granted).toBe(2);
		expect(catalog?.total).toBeGreaterThan(2);
		expect(
			coverage.find((line) => line.groupKey === 'admin.role.group.pages')
				?.granted
		).toBe(0);
	});
});

describe('searchCatalog', () => {
	const translate = (key: string) => key;

	it('hands back the whole catalog for an empty search', () => {
		expect(searchCatalog('  ', translate).length).toBeGreaterThan(4);
	});

	it('keeps a whole group when the group itself matches', () => {
		const groups = searchCatalog('group.pages', translate);

		expect(groups).toHaveLength(1);
		expect(groups[0].resources.length).toBeGreaterThan(4);
	});

	it('narrows a group to the rows that match', () => {
		const groups = searchCatalog('resource.album', translate);

		expect(
			groups.every((group) =>
				group.resources.every((resource) =>
					resource.labelKey.includes('album')
				)
			)
		).toBe(true);
	});

	/** An admin who knows the permission name should find it by that too. */
	it('finds a row by the permission name itself', () => {
		const groups = searchCatalog('createartistentity', translate);

		expect(
			groups.flatMap((group) => group.resources).map((r) => r.resource)
		).toContain('ArtistEntity');
	});
});

describe('keepsMyAccess', () => {
	it('is true for a role being added', () => {
		expect(
			keepsMyAccess(draft({ permissions: [] }), {
				myRoleNames: ['ADMIN'],
				roles: CATALOG,
				uid: null,
			})
		).toBe(true);
	});
});
