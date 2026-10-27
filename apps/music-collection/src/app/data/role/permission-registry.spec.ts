import {
	describePermission,
	groupPermissions,
	hasWildcard,
} from './permission-registry';

describe('describePermission', () => {
	it('reads a permission name back as what it means', () => {
		expect(describePermission('createArtistEntity')).toEqual({
			action: 'create',
			groupKey: 'admin.role.group.catalog',
			labelKey: 'admin.role.resource.artist',
			permission: 'createArtistEntity',
			resource: 'ArtistEntity',
		});
	});

	it('tells an owned entity apart from the catalog one', () => {
		expect(describePermission('createOwnedArtistEntity')?.groupKey).toBe(
			'admin.role.group.owned'
		);
	});

	it('knows nothing of a permission the catalog does not offer', () => {
		expect(describePermission('createSomethingElse')).toBeNull();
		// The wildcard is not a row of the grid; it stands on its own.
		expect(describePermission('ADMIN')).toBeNull();
	});
});

describe('groupPermissions', () => {
	it('sorts permissions into the groups and rows of the catalog', () => {
		expect(
			groupPermissions([
				'updateAlbumEntity',
				'createArtistEntity',
				'createAlbumEntity',
			])
		).toEqual([
			{
				groupKey: 'admin.role.group.catalog',
				lines: [
					{
						labelKey: 'admin.role.resource.artist',
						actions: ['create'],
					},
					{
						labelKey: 'admin.role.resource.album',
						actions: ['create', 'update'],
					},
				],
			},
		]);
	});

	/** However the list arrived, a role reads the same way wherever shown. */
	it('keeps the order of the catalog, not of the input', () => {
		const groups = groupPermissions([
			'viewAlbumListPage',
			'createAlbumEntity',
		]);

		expect(groups.map(({ groupKey }) => groupKey)).toEqual([
			'admin.role.group.catalog',
			'admin.role.group.pages',
		]);
	});

	it('leaves out what it does not recognise', () => {
		expect(groupPermissions(['ADMIN', 'somethingElse'])).toEqual([]);
	});
});

describe('hasWildcard', () => {
	it('spots the one permission that makes the rest moot', () => {
		expect(hasWildcard(['createAlbumEntity', 'ADMIN'])).toBe(true);
		expect(hasWildcard(['createAlbumEntity'])).toBe(false);
	});
});
