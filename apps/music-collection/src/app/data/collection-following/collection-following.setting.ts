import { UserSetting } from '../user-settings';

/**
 * Which collections the collector is after. Collections are defined by a
 * rule, so the catalog may hold hundreds of them while only a few are
 * anyone's own goal — this is that pick, kept per user.
 *
 * An empty list is "has not chosen yet", not "wants none": the pages then
 * show everything rather than an empty shelf.
 *
 * Which of the pick is shown to others is kept here too — see `shown`.
 */
export interface CollectionFollowing {
	/** Uids of the followed collections, in the order they were picked. */
	followed: string[];
	/**
	 * Which of them the collector shows to others.
	 *
	 * Following is taking a collection on, and that is the collector's own
	 * business: it stays private until they say otherwise. This is the subset
	 * they have said otherwise about — what their public page lists as what
	 * they are collecting, and what the wall counts them into. A collection
	 * followed but not shown is a hunt nobody else hears about, which is
	 * exactly what a surprise needs.
	 */
	shown: string[];
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
	toValue: (data) => {
		const followed = toUids(data['followed']);

		return {
			followed,
			// Shown is meaningless without the following it refers to, and a
			// document written before this field existed has none.
			shown: toUids(data['shown']).filter((uid) =>
				followed.includes(uid)
			),
		};
	},
	toDocument: ({ followed, shown }) => ({ followed, shown }),
};
