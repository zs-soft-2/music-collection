/**
 * The permissions a role may carry, as the admin page offers them.
 *
 * A permission name is an action followed by a resource — `createArtistEntity`
 * is `create` + `ArtistEntity` — and that is how both the Firestore rules and
 * the client check them. So the catalog is not a flat list of strings but a
 * grid: a group of resources, and per resource the actions that are actually
 * checked somewhere. Offering `viewArtistEntity` because the pattern allows it
 * would put a checkbox on the page that grants nothing.
 *
 * `permission-catalog.spec.ts` reads `firestore.rules` and `storage.rules` and
 * fails when they check a permission this file does not offer: the rules are
 * where a permission becomes real, and a role editor that cannot grant one is
 * worse than no editor at all.
 *
 * It lives under the application rather than in `libs/api` on purpose — only
 * the two admin pages read it, and a value exported from the shared barrel is
 * pulled into the main bundle by every consumer.
 */

/**
 * The wildcard. Whoever holds it passes every check, in the rules and on the
 * client alike, so it stands on its own above the grid rather than in it.
 */
export const ADMIN_PERMISSION = 'ADMIN';

/**
 * Holding any one of these is what makes it possible to come back to the
 * access pages and put a permission back. A save that would leave the
 * signed-in admin without one of them is refused: there is no way back from
 * it inside the app, only a script run against the database.
 */
export const ACCESS_PERMISSIONS = [ADMIN_PERMISSION, 'updateUserEntity'];

/** Whether these permissions still let their holder manage access. */
export const keepsAccess = (permissions: string[]): boolean =>
	ACCESS_PERMISSIONS.some((permission) => permissions.includes(permission));

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

/** Column order of the grid; a resource shows the ones it declares. */
export const PERMISSION_ACTIONS: readonly PermissionAction[] = [
	'view',
	'create',
	'update',
	'delete',
];

export interface PermissionResource {
	/** The token a permission name is built from, e.g. `ArtistEntity`. */
	resource: string;
	/** Translation key of the row label. */
	labelKey: string;
	/** The actions the rules, the functions or the client check for it. */
	actions: PermissionAction[];
}

export interface PermissionGroup {
	labelKey: string;
	hintKey: string;
	resources: PermissionResource[];
}

/** The permission an action on a resource grants. */
export const toPermission = (
	action: PermissionAction,
	resource: string
): string => `${action}${resource}`;

/** Every entity that is written through the catalog's own rules. */
const CATALOG_WRITES: PermissionAction[] = ['create', 'update', 'delete'];

/** What a collector may do with their own data, their own copies included. */
const OWN_DATA: PermissionAction[] = ['view', 'create', 'update', 'delete'];

const ownedResource = (
	entity: string,
	labelKey: string
): PermissionResource => ({
	resource: `Owned${entity}Entity`,
	labelKey,
	actions: OWN_DATA,
});

const pageResource = (resource: string, labelKey: string) => ({
	resource,
	labelKey,
	actions: ['view'] as PermissionAction[],
});

export const PERMISSION_CATALOG: PermissionGroup[] = [
	{
		labelKey: 'admin.role.group.catalog',
		hintKey: 'admin.role.group.catalog-hint',
		resources: [
			{
				resource: 'ArtistEntity',
				labelKey: 'admin.role.resource.artist',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'AlbumEntity',
				labelKey: 'admin.role.resource.album',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'ReleaseEntity',
				labelKey: 'admin.role.resource.release',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'TrackEntity',
				labelKey: 'admin.role.resource.track',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'LabelEntity',
				labelKey: 'admin.role.resource.label',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'MusicianEntity',
				labelKey: 'admin.role.resource.musician',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'MembershipEntity',
				labelKey: 'admin.role.resource.membership',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'ContributionEntity',
				labelKey: 'admin.role.resource.contribution',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'DocumentEntity',
				labelKey: 'admin.role.resource.document',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'GenreEntity',
				labelKey: 'admin.role.resource.genre',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'MusicCollectionEntity',
				labelKey: 'admin.role.resource.musicCollection',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'EntityQuantityEntity',
				labelKey: 'admin.role.resource.entityQuantity',
				actions: CATALOG_WRITES,
			},
		],
	},
	{
		labelKey: 'admin.role.group.collector',
		hintKey: 'admin.role.group.collector-hint',
		resources: [
			{
				resource: 'CollectionItemEntity',
				labelKey: 'admin.role.resource.collectionItem',
				actions: OWN_DATA,
			},
			{
				resource: 'WishlistItemEntity',
				labelKey: 'admin.role.resource.wishlistItem',
				actions: OWN_DATA,
			},
			{
				resource: 'ReleaseRequestEntity',
				labelKey: 'admin.role.resource.releaseRequest',
				actions: ['create', 'delete'],
			},
		],
	},
	{
		labelKey: 'admin.role.group.owned',
		hintKey: 'admin.role.group.owned-hint',
		resources: [
			ownedResource('Artist', 'admin.role.resource.artist'),
			ownedResource('Album', 'admin.role.resource.album'),
			ownedResource('Release', 'admin.role.resource.release'),
			ownedResource('Track', 'admin.role.resource.track'),
			ownedResource('Label', 'admin.role.resource.label'),
			ownedResource('Musician', 'admin.role.resource.musician'),
			ownedResource('Membership', 'admin.role.resource.membership'),
			ownedResource('Contribution', 'admin.role.resource.contribution'),
			ownedResource('Document', 'admin.role.resource.document'),
		],
	},
	{
		labelKey: 'admin.role.group.access',
		hintKey: 'admin.role.group.access-hint',
		resources: [
			{
				resource: 'RoleEntity',
				labelKey: 'admin.role.resource.role',
				actions: CATALOG_WRITES,
			},
			{
				resource: 'UserEntity',
				labelKey: 'admin.role.resource.user',
				actions: OWN_DATA,
			},
			{
				resource: 'SecurityEntity',
				labelKey: 'admin.role.resource.security',
				actions: ['view'],
			},
		],
	},
	{
		labelKey: 'admin.role.group.system',
		hintKey: 'admin.role.group.system-hint',
		resources: [
			{
				resource: 'DefaultLanguage',
				labelKey: 'admin.role.resource.defaultLanguage',
				actions: ['update'],
			},
			{
				resource: 'BadgeGenerationSettings',
				labelKey: 'admin.role.resource.badgeSettings',
				actions: ['update'],
			},
		],
	},
	{
		labelKey: 'admin.role.group.pages',
		hintKey: 'admin.role.group.pages-hint',
		resources: [
			pageResource('ArtistListPage', 'admin.role.page.artistList'),
			pageResource('ArtistEditPage', 'admin.role.page.artistEdit'),
			pageResource('AlbumListPage', 'admin.role.page.albumList'),
			pageResource('AlbumEditPage', 'admin.role.page.albumEdit'),
			pageResource('ReleaseListPage', 'admin.role.page.releaseList'),
			pageResource('ReleaseEditPage', 'admin.role.page.releaseEdit'),
			pageResource('LabelListPage', 'admin.role.page.labelList'),
			pageResource('LabelEditPage', 'admin.role.page.labelEdit'),
			pageResource('MusicianListPage', 'admin.role.page.musicianList'),
			pageResource('MusicianEditPage', 'admin.role.page.musicianEdit'),
			pageResource('DocumentListPage', 'admin.role.page.documentList'),
			pageResource('DocumentEditPage', 'admin.role.page.documentEdit'),
			pageResource(
				'CollectionItemListPage',
				'admin.role.page.collectionItemList'
			),
			pageResource(
				'CollectionItemEditPage',
				'admin.role.page.collectionItemEdit'
			),
			pageResource(
				'WishlistItemListPage',
				'admin.role.page.wishlistItemList'
			),
			pageResource(
				'WishlistItemEditPage',
				'admin.role.page.wishlistItemEdit'
			),
		],
	},
];

/** Every permission the catalog offers, the wildcard included. */
export const catalogPermissions = (): string[] => [
	ADMIN_PERMISSION,
	...PERMISSION_CATALOG.flatMap((group) =>
		group.resources.flatMap((resource) =>
			resource.actions.map((action) =>
				toPermission(action, resource.resource)
			)
		)
	),
];

/**
 * The permissions a role carries that the catalog does not know — written by a
 * script, or left over from a resource that has since been renamed. They are
 * kept and shown rather than dropped: a save that silently took a permission
 * away would be the worst kind of write on this page.
 */
export const unknownPermissions = (permissions: string[]): string[] => {
	const known = new Set(catalogPermissions());

	return permissions.filter((permission) => !known.has(permission)).sort();
};
