import { UserSetting } from '../../data/user-settings';

/**
 * Which collections the collector is after. Collections are defined by a
 * rule, so the catalog may hold hundreds of them while only a few are
 * anyone's own goal — this is that pick, kept per user.
 *
 * An empty list is "has not chosen yet", not "wants none": the pages then
 * show everything rather than an empty shelf.
 */
export interface CollectionFollowing {
	/** Uids of the followed collections, in the order they were picked. */
	followed: string[];
}

function toUids(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((uid): uid is string => typeof uid === 'string')
		: [];
}

export const COLLECTION_FOLLOWING_SETTING: UserSetting<CollectionFollowing> = {
	id: 'collection-following',
	featureKey: 'collection-following-setting',
	storageKey: 'mc-collection-following',
	toValue: (data) => ({ followed: toUids(data['followed']) }),
	toDocument: ({ followed }) => ({ followed }),
};
