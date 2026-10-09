import {
	ActionEnum,
	AlbumPermissionsService,
	AlbumResourceEnum,
	ArtistPermissionsService,
	ArtistResourceEnum,
	CollectionItemPermissionsService,
	CollectionItemResourceEnum,
	ConcertPermissionsService,
	ContributionPermissionsService,
	DocumentPermissionsService,
	DocumentResourceEnum,
	EntityQuantityPermissionsService,
	GenrePermissionsService,
	LabelPermissionsService,
	LabelResourceEnum,
	MembershipPermissionsService,
	MusicianPermissionsService,
	MusicianResourceEnum,
	OwnedPermissionsService,
	ReleasePermissionsService,
	ReleaseResourceEnum,
	RolePermissionsService,
	SecurityPermissionsService,
	SettingPermissionsService,
	TrackPermissionsService,
	UserPermissionsService,
	WishlistItemPermissionsService,
	WishlistItemResourceEnum,
} from '@music-collection/api';
import { MusicCollectionPermissionsService } from '@music-collection/domain/music-collection/api';

/**
 * The permissions a role may carry, as the admin page offers them.
 *
 * Every name here is read off a constant the codebase already declares — the
 * `*PermissionsService` classes next to each entity, built from `ActionEnum`
 * and the resource enums. Nothing is spelled out as a string: a permission
 * this file invented would be a checkbox that grants nothing, and a permission
 * that got renamed would silently become one. Referencing the constants makes
 * the first impossible to write and the second a compile error.
 *
 * What is *offered* is narrower than what is declared, because a permission
 * only means something where it is checked. There are three places that check
 * one: the two rule files, the route guards (`only: [...]`), and the callables
 * through `requireCaller`. `permission-catalog.spec.ts` reads all three and
 * fails both ways — on a permission they check that the page cannot grant, and
 * on a permission the page offers that none of them ever reads. That test, not
 * the eye, is what decides which actions a row shows.
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
 * access pages and put a permission back: the wildcard, the role editor
 * itself, or the user admin, where a role that still carries the right can be
 * handed to somebody. A save that would leave the signed-in admin without one
 * of them is refused — there is no way back from it inside the app, only a
 * script run against the database.
 */
export const ACCESS_PERMISSIONS = [
	ADMIN_PERMISSION,
	RolePermissionsService.updateRoleEntity,
	UserPermissionsService.updateUserEntity,
];

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
	/** The actions the rules, the callables or the guards check for it. */
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

/** A permission name split back into the two halves it was built from. */
const fromPermission = (
	permission: string
): { action: PermissionAction; resource: string } => {
	const action = PERMISSION_ACTIONS.find((candidate) =>
		permission.startsWith(candidate)
	);

	if (!action) {
		throw new Error(`Not an action on a resource: ${permission}`);
	}

	return { action, resource: permission.slice(action.length) };
};

/**
 * One row of the grid, read off the permissions handed in. They must all名
 * the same resource — a row is one resource and the actions it accepts.
 */
const row = (
	labelKey: string,
	permissions: readonly string[]
): PermissionResource => {
	const parsed = permissions.map(fromPermission);
	const [first] = parsed;

	if (!first) {
		throw new Error(`A row with no permission: ${labelKey}`);
	}

	if (parsed.some(({ resource }) => resource !== first.resource)) {
		throw new Error(
			`A row over more than one resource: ${permissions.join(', ')}`
		);
	}

	return {
		resource: first.resource,
		labelKey,
		actions: PERMISSION_ACTIONS.filter((action) =>
			parsed.some((permission) => permission.action === action)
		),
	};
};

/**
 * A page row. The constant is declared by the admin library that guards the
 * route (`ArtistAdminPermissionsService.viewArtistListPage`), which lives
 * behind a lazy Angular module — importing it here would drag that module into
 * this page's bundle. So the name is composed from the same two halves it is
 * composed from there, and the test holds the two spellings together.
 */
const pageRow = (labelKey: string, page: string): PermissionResource =>
	row(labelKey, [ActionEnum.VIEW.toString() + page]);

/** What an admin may be given. */
export const PERMISSION_CATALOG: PermissionGroup[] = [
	{
		labelKey: 'admin.role.group.catalog',
		hintKey: 'admin.role.group.catalog-hint',
		resources: [
			row('admin.role.resource.artist', [
				ArtistPermissionsService.createArtistEntity,
				ArtistPermissionsService.updateArtistEntity,
				ArtistPermissionsService.deleteArtistEntity,
			]),
			row('admin.role.resource.album', [
				AlbumPermissionsService.createAlbumEntity,
				AlbumPermissionsService.updateAlbumEntity,
				AlbumPermissionsService.deleteAlbumEntity,
			]),
			row('admin.role.resource.release', [
				ReleasePermissionsService.createReleaseEntity,
				ReleasePermissionsService.updateReleaseEntity,
				ReleasePermissionsService.deleteReleaseEntity,
			]),
			row('admin.role.resource.track', [
				TrackPermissionsService.createTrackEntity,
				TrackPermissionsService.updateTrackEntity,
				TrackPermissionsService.deleteTrackEntity,
			]),
			row('admin.role.resource.label', [
				LabelPermissionsService.createLabelEntity,
				LabelPermissionsService.updateLabelEntity,
				LabelPermissionsService.deleteLabelEntity,
			]),
			row('admin.role.resource.musician', [
				MusicianPermissionsService.createMusicianEntity,
				MusicianPermissionsService.updateMusicianEntity,
				MusicianPermissionsService.deleteMusicianEntity,
			]),
			row('admin.role.resource.membership', [
				MembershipPermissionsService.createMembershipEntity,
				MembershipPermissionsService.updateMembershipEntity,
				MembershipPermissionsService.deleteMembershipEntity,
			]),
			row('admin.role.resource.contribution', [
				ContributionPermissionsService.createContributionEntity,
				ContributionPermissionsService.updateContributionEntity,
				ContributionPermissionsService.deleteContributionEntity,
			]),
			row('admin.role.resource.document', [
				DocumentPermissionsService.createDocumentEntity,
				DocumentPermissionsService.updateDocumentEntity,
				DocumentPermissionsService.deleteDocumentEntity,
			]),
			row('admin.role.resource.genre', [
				GenrePermissionsService.createGenreEntity,
				GenrePermissionsService.updateGenreEntity,
				GenrePermissionsService.deleteGenreEntity,
			]),
			// A helyszín és a koncert külön erőforrás: a helyszínlista
			// törzsadat, amit egy betöltés tölt fel, a koncert pedig az, ami a
			// nyilvános lapon megjelenik.
			//
			// A `view` itt is szerepel, ugyanazért, amiért a koncertnél: a
			// modell javasolta helyszínek (`venue-suggestion`) nem
			// nyilvánosak, és ez a jog nyitja meg őket.
			row('admin.role.resource.venue', [
				ConcertPermissionsService.viewVenueEntity,
				ConcertPermissionsService.createVenueEntity,
				ConcertPermissionsService.updateVenueEntity,
				ConcertPermissionsService.deleteVenueEntity,
			]),
			// A `view` is szerepel: a jóváhagyásra váró javaslatokat ez a jog
			// nyitja meg, és az nem a nyilvános lap része.
			row('admin.role.resource.concert', [
				ConcertPermissionsService.viewConcertEntity,
				ConcertPermissionsService.createConcertEntity,
				ConcertPermissionsService.updateConcertEntity,
				ConcertPermissionsService.deleteConcertEntity,
			]),
			row('admin.role.resource.musicCollection', [
				MusicCollectionPermissionsService.createMusicCollectionEntity,
				MusicCollectionPermissionsService.updateMusicCollectionEntity,
				MusicCollectionPermissionsService.deleteMusicCollectionEntity,
			]),
			// One permission for all three writes: the document is a
			// by-product of the sync, and the rules gate its create, update
			// and delete on the same name.
			row('admin.role.resource.entityQuantity', [
				EntityQuantityPermissionsService.updateEntityQuantityEntity,
			]),
		],
	},
	{
		labelKey: 'admin.role.group.access',
		hintKey: 'admin.role.group.access-hint',
		resources: [
			row('admin.role.resource.role', [
				RolePermissionsService.createRoleEntity,
				RolePermissionsService.updateRoleEntity,
				RolePermissionsService.deleteRoleEntity,
			]),
			row('admin.role.resource.user', [
				UserPermissionsService.viewUserEntity,
				UserPermissionsService.createUserEntity,
				UserPermissionsService.updateUserEntity,
				UserPermissionsService.deleteUserEntity,
			]),
			row('admin.role.resource.security', [
				SecurityPermissionsService.viewSecurityEntity,
			]),
		],
	},
	{
		labelKey: 'admin.role.group.system',
		hintKey: 'admin.role.group.system-hint',
		resources: [
			row('admin.role.resource.defaultLanguage', [
				SettingPermissionsService.updateDefaultLanguage,
			]),
			row('admin.role.resource.badgeSettings', [
				SettingPermissionsService.updateBadgeGenerationSettings,
			]),
		],
	},
	{
		labelKey: 'admin.role.group.pages',
		hintKey: 'admin.role.group.pages-hint',
		resources: [
			pageRow(
				'admin.role.page.artistList',
				ArtistResourceEnum.ARTIST_LIST_PAGE
			),
			pageRow(
				'admin.role.page.artistEdit',
				ArtistResourceEnum.ARTIST_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.albumList',
				AlbumResourceEnum.ALBUM_LIST_PAGE
			),
			pageRow(
				'admin.role.page.albumEdit',
				AlbumResourceEnum.ALBUM_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.releaseList',
				ReleaseResourceEnum.RELEASE_LIST_PAGE
			),
			pageRow(
				'admin.role.page.releaseEdit',
				ReleaseResourceEnum.RELEASE_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.labelList',
				LabelResourceEnum.LABEL_LIST_PAGE
			),
			pageRow(
				'admin.role.page.labelEdit',
				LabelResourceEnum.LABEL_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.musicianList',
				MusicianResourceEnum.MUSICIAN_LIST_PAGE
			),
			pageRow(
				'admin.role.page.musicianEdit',
				MusicianResourceEnum.MUSICIAN_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.documentList',
				DocumentResourceEnum.DOCUMENT_LIST_PAGE
			),
			pageRow(
				'admin.role.page.documentEdit',
				DocumentResourceEnum.DOCUMENT_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.collectionItemList',
				CollectionItemResourceEnum.COLLECTION_ITEM_LIST_PAGE
			),
			pageRow(
				'admin.role.page.collectionItemEdit',
				CollectionItemResourceEnum.COLLECTION_ITEM_EDIT_PAGE
			),
			pageRow(
				'admin.role.page.wishlistItemList',
				WishlistItemResourceEnum.WISHLIST_ITEM_LIST_PAGE
			),
			pageRow(
				'admin.role.page.wishlistItemEdit',
				WishlistItemResourceEnum.WISHLIST_ITEM_EDIT_PAGE
			),
		],
	},
];

/**
 * What every collector has already, and nobody hands out.
 *
 * The `USER` role carries these, and the permission sync puts that role on a
 * user document the moment it appears (`apps/functions` — `DEFAULT_ROLE`). So
 * they are not a role's business: a checkbox for them would say that an admin
 * decides whether a collector may put a record on their own shelf, and the
 * one thing it could really do is take it away from everybody at once.
 *
 * The editor shows them, because a page that leaves them out would suggest a
 * new role starts from nothing. It shows them as they are — carried, not
 * given.
 */
export const USER_BASELINE_GROUPS: PermissionGroup[] = [
	{
		labelKey: 'admin.role.group.collector',
		hintKey: 'admin.role.group.collector-hint',
		resources: [
			row('admin.role.resource.collectionItem', [
				CollectionItemPermissionsService.createCollectionItemEntity,
				CollectionItemPermissionsService.updateCollectionItemEntity,
				CollectionItemPermissionsService.deleteCollectionItemEntity,
			]),
			row('admin.role.resource.wishlistItem', [
				WishlistItemPermissionsService.createWishlistItemEntity,
				WishlistItemPermissionsService.updateWishlistItemEntity,
				WishlistItemPermissionsService.deleteWishlistItemEntity,
			]),
		],
	},
	{
		labelKey: 'admin.role.group.owned',
		hintKey: 'admin.role.group.owned-hint',
		resources: [
			row('admin.role.resource.artist', [
				OwnedPermissionsService.createOwnedArtistEntity,
				OwnedPermissionsService.updateOwnedArtistEntity,
				OwnedPermissionsService.deleteOwnedArtistEntity,
			]),
			row('admin.role.resource.album', [
				OwnedPermissionsService.createOwnedAlbumEntity,
				OwnedPermissionsService.updateOwnedAlbumEntity,
				OwnedPermissionsService.deleteOwnedAlbumEntity,
			]),
			row('admin.role.resource.release', [
				OwnedPermissionsService.createOwnedReleaseEntity,
				OwnedPermissionsService.updateOwnedReleaseEntity,
				OwnedPermissionsService.deleteOwnedReleaseEntity,
			]),
			row('admin.role.resource.track', [
				OwnedPermissionsService.createOwnedTrackEntity,
				OwnedPermissionsService.updateOwnedTrackEntity,
				OwnedPermissionsService.deleteOwnedTrackEntity,
			]),
			row('admin.role.resource.label', [
				OwnedPermissionsService.createOwnedLabelEntity,
				OwnedPermissionsService.updateOwnedLabelEntity,
				OwnedPermissionsService.deleteOwnedLabelEntity,
			]),
			row('admin.role.resource.musician', [
				OwnedPermissionsService.createOwnedMusicianEntity,
				OwnedPermissionsService.updateOwnedMusicianEntity,
				OwnedPermissionsService.deleteOwnedMusicianEntity,
			]),
			row('admin.role.resource.membership', [
				OwnedPermissionsService.createOwnedMembershipEntity,
				OwnedPermissionsService.updateOwnedMembershipEntity,
				OwnedPermissionsService.deleteOwnedMembershipEntity,
			]),
			row('admin.role.resource.contribution', [
				OwnedPermissionsService.createOwnedContributionEntity,
				OwnedPermissionsService.updateOwnedContributionEntity,
				OwnedPermissionsService.deleteOwnedContributionEntity,
			]),
			row('admin.role.resource.document', [
				OwnedPermissionsService.createOwnedDocumentEntity,
				OwnedPermissionsService.updateOwnedDocumentEntity,
				OwnedPermissionsService.deleteOwnedDocumentEntity,
			]),
		],
	},
];

/** Every group the app can put a name to, carried ones included. */
export const ALL_PERMISSION_GROUPS: PermissionGroup[] = [
	...PERMISSION_CATALOG,
	...USER_BASELINE_GROUPS,
];

const flatten = (groups: PermissionGroup[]): string[] =>
	groups.flatMap((group) =>
		group.resources.flatMap((resource) =>
			resource.actions.map((action) =>
				toPermission(action, resource.resource)
			)
		)
	);

/** Everything the grid can hand out, the wildcard included. */
export const grantablePermissions = (): string[] => [
	ADMIN_PERMISSION,
	...flatten(PERMISSION_CATALOG),
];

/** What the `USER` role carries for every collector. */
export const baselinePermissions = (): string[] =>
	flatten(USER_BASELINE_GROUPS);

/** Every permission the app knows by name, whether it hands it out or not. */
export const catalogPermissions = (): string[] => [
	ADMIN_PERMISSION,
	...flatten(ALL_PERMISSION_GROUPS),
];

/**
 * The permissions a role carries that the app does not know — written by a
 * script, or left over from a resource that has since been renamed. They are
 * kept and shown rather than dropped: a save that silently took a permission
 * away would be the worst kind of write on this page.
 */
export const unknownPermissions = (permissions: string[]): string[] => {
	const known = new Set(catalogPermissions());

	return permissions.filter((permission) => !known.has(permission)).sort();
};
