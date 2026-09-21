export interface AdminNavItem {
	label: string;
	/** Útvonal az /admin alatt. */
	route: string;
	icon: string;
	/** A megszámolt entitás típusa (`EntityCounts` kulcs), ha van. */
	countType?: string;
	/** Új elem felvétele (a lista „Add” gombjával azonos cél). */
	createLabel?: string;
	/** Teendők száma a menüpont mellett (pl. függő kérések). */
	badge?: 'pendingReleaseRequests';
}

export interface AdminNavGroup {
	label: string;
	items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
	{
		label: '',
		items: [{ label: 'Dashboard', route: 'dashboard', icon: 'pi-home' }],
	},
	{
		label: 'Catalog',
		items: [
			{
				label: 'Artists',
				route: 'artist',
				icon: 'pi-microphone',
				countType: 'Artist',
				createLabel: 'Add artist',
			},
			{
				label: 'Musicians',
				route: 'musician',
				icon: 'pi-user',
				countType: 'Musician',
				createLabel: 'Add musician',
			},
			{
				label: 'Albums',
				route: 'album',
				icon: 'pi-circle',
				countType: 'Album',
				createLabel: 'Add album',
			},
			{
				label: 'Releases',
				route: 'release',
				icon: 'pi-clone',
				countType: 'Release',
				createLabel: 'Add release',
			},
			{
				label: 'Labels',
				route: 'label',
				icon: 'pi-building',
				countType: 'Label',
				createLabel: 'Add label',
			},
			{
				label: 'Collections',
				route: 'music-collection',
				icon: 'pi-bookmark',
				createLabel: 'Add collection',
			},
		],
	},
	{
		label: 'User data',
		items: [
			{
				label: 'Collection items',
				route: 'collection-item',
				icon: 'pi-th-large',
				countType: 'Collection Item',
			},
			{
				label: 'Release requests',
				route: 'release-request',
				icon: 'pi-inbox',
				badge: 'pendingReleaseRequests',
			},
			{
				label: 'Wishlist items',
				route: 'wishlist-item',
				icon: 'pi-heart',
				countType: 'Wishlist Item',
			},
		],
	},
	{
		label: 'System',
		items: [
			{
				label: 'Documents',
				route: 'document',
				icon: 'pi-file',
				countType: 'Document',
			},
			{
				label: 'Badge generation',
				route: 'badge-settings',
				icon: 'pi-sparkles',
			},
		],
	},
];
