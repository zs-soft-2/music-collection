import { UserSetting } from '../../data/user-settings';
import {
	CollectionGroup,
	CollectionSort,
	CollectionView,
	GROUP_OPTIONS,
	SORT_OPTIONS,
	VIEW_OPTIONS,
} from './collection.model';

/** How the collection is laid out; null where the user has not chosen. */
export interface CollectionViewSettings {
	sort: CollectionSort | null;
	group: CollectionGroup | null;
	view: CollectionView | null;
}

/** What the collection shows before anything is chosen. */
export const COLLECTION_VIEW_DEFAULTS: {
	sort: CollectionSort;
	group: CollectionGroup;
	view: CollectionView;
} = {
	sort: 'artist',
	group: 'none',
	view: 'grid',
};

/** A stored value counts only while the option it names still exists. */
function known<T>(options: readonly { value: T }[], value: unknown): T | null {
	return options.some((option) => option.value === value)
		? (value as T)
		: null;
}

export const COLLECTION_VIEW_SETTING: UserSetting<CollectionViewSettings> = {
	id: 'collection-view',
	featureKey: 'collection-view-setting',
	// The key the page used before the setting moved to the account, so what
	// a browser already holds is read rather than thrown away.
	storageKey: 'mc.collection.preferences',
	toValue: (data) => ({
		sort: known(SORT_OPTIONS, data['sort']),
		group: known(GROUP_OPTIONS, data['group']),
		view: known(VIEW_OPTIONS, data['view']),
	}),
	toDocument: ({ sort, group, view }) => ({ sort, group, view }),
};
