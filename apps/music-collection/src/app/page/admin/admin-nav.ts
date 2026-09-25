export interface AdminNavItem {
	/** A menüpont szövegének szótárkulcsa, pl. `admin.nav.artists`. */
	labelKey: string;
	/** Útvonal az /admin alatt. */
	route: string;
	icon: string;
	/** A megszámolt entitás típusa (`EntityCounts` kulcs), ha van. */
	countType?: string;
	/** Új elem felvételének szótárkulcsa (a lista „Add” gombjával azonos cél). */
	createLabelKey?: string;
	/** Teendők száma a menüpont mellett (pl. függő kérések). */
	badge?: 'pendingReleaseRequests';
}

export interface AdminNavGroup {
	/** A csoport címének szótárkulcsa; üres, ha a csoportnak nincs címe. */
	labelKey: string;
	items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
	{
		labelKey: '',
		items: [
			{
				labelKey: 'admin.nav.dashboard',
				route: 'dashboard',
				icon: 'pi-home',
			},
		],
	},
	{
		labelKey: 'admin.nav.catalog',
		items: [
			{
				labelKey: 'admin.nav.artists',
				route: 'artist',
				icon: 'pi-microphone',
				countType: 'Artist',
				createLabelKey: 'ui.artistAdmin.add-artist',
			},
			{
				labelKey: 'admin.nav.musicians',
				route: 'musician',
				icon: 'pi-user',
				countType: 'Musician',
				createLabelKey: 'ui.musicianAdmin.add-musician',
			},
			{
				labelKey: 'admin.nav.albums',
				route: 'album',
				icon: 'pi-circle',
				countType: 'Album',
				createLabelKey: 'ui.albumAdmin.add-album',
			},
			{
				labelKey: 'admin.nav.releases',
				route: 'release',
				icon: 'pi-clone',
				countType: 'Release',
				createLabelKey: 'ui.releaseAdmin.add-release',
			},
			{
				labelKey: 'admin.nav.labels',
				route: 'label',
				icon: 'pi-building',
				countType: 'Label',
				createLabelKey: 'ui.labelAdmin.add-label',
			},
			{
				labelKey: 'admin.nav.collections',
				route: 'music-collection',
				icon: 'pi-bookmark',
				createLabelKey: 'ui.musicCollectionAdmin.add-collection',
			},
		],
	},
	{
		labelKey: 'admin.nav.userData',
		items: [
			{
				labelKey: 'admin.nav.collectionItems',
				route: 'collection-item',
				icon: 'pi-th-large',
				countType: 'Collection Item',
			},
			{
				labelKey: 'admin.nav.releaseRequests',
				route: 'release-request',
				icon: 'pi-inbox',
				badge: 'pendingReleaseRequests',
			},
			{
				labelKey: 'admin.nav.wishlistItems',
				route: 'wishlist-item',
				icon: 'pi-heart',
				countType: 'Wishlist Item',
			},
		],
	},
	{
		labelKey: 'admin.nav.system',
		items: [
			{
				labelKey: 'admin.nav.documents',
				route: 'document',
				icon: 'pi-file',
				countType: 'Document',
			},
			{
				labelKey: 'admin.nav.dailyQuestion',
				route: 'daily-question',
				icon: 'pi-question-circle',
			},
			{
				labelKey: 'admin.nav.badgeGeneration',
				route: 'badge-settings',
				icon: 'pi-sparkles',
			},
			{
				labelKey: 'admin.nav.language',
				route: 'language-settings',
				icon: 'pi-globe',
			},
		],
	},
];
