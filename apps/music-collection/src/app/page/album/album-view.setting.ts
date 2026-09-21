import { UserSetting } from '../../data/user-settings';

/** How an album page is laid out; null where the user has not chosen. */
export interface AlbumViewSettings {
	/** Sections collapsed, so the whole album fits on one screen. */
	compact: boolean | null;
}

export const ALBUM_VIEW_SETTING: UserSetting<AlbumViewSettings> = {
	id: 'album-view',
	featureKey: 'album-view-setting',
	// The key the page used before the setting moved to the account.
	storageKey: 'mc-album-compact',
	toValue: (data) => ({
		// That key held the flag on its own ("true"), not an object.
		compact:
			typeof data === 'boolean'
				? data
				: typeof data['compact'] === 'boolean'
					? data['compact']
					: null,
	}),
	toDocument: ({ compact }) => ({ compact }),
};
