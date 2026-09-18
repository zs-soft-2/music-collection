export interface AdminNavItem {
	label: string;
	/** Útvonal az /admin alatt. */
	route: string;
	icon: string;
	/** Az entitás-számláló típusa, ha van. */
	quantityType?: string;
	/** Új elem felvétele (a lista „Add” gombjával azonos cél). */
	createLabel?: string;
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
				quantityType: 'Artist',
				createLabel: 'Add artist',
			},
			{
				label: 'Musicians',
				route: 'musician',
				icon: 'pi-user',
				createLabel: 'Add musician',
			},
			{
				label: 'Albums',
				route: 'album',
				icon: 'pi-circle',
				quantityType: 'Album',
				createLabel: 'Add album',
			},
			{
				label: 'Releases',
				route: 'release',
				icon: 'pi-clone',
				quantityType: 'Release',
				createLabel: 'Add release',
			},
			{
				label: 'Labels',
				route: 'label',
				icon: 'pi-building',
				quantityType: 'Label',
				createLabel: 'Add label',
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
				quantityType: 'Collection Item',
			},
			{
				label: 'Wishlist items',
				route: 'wishlist-item',
				icon: 'pi-heart',
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
				quantityType: 'Document',
			},
		],
	},
];
