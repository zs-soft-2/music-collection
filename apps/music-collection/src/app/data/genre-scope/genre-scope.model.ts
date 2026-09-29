import { GENRE_SCOPE_LIMIT } from '@music-collection/api';

import { UserSetting } from '../user-settings';

/**
 * The genres the collector follows, by slug.
 *
 * Null and empty are not the same thing. Null is an account that has never
 * said — a collector signing in on a second machine, whose choice there must
 * stand — while an empty list is them saying "all of it", which has to be
 * able to travel between machines like any other choice.
 */
export interface GenreScopeSettings {
	genres: string[] | null;
}

export const GENRE_SCOPE_SETTING: UserSetting<GenreScopeSettings> = {
	id: 'genre-scope',
	featureKey: 'genre-scope-setting',
	/**
	 * The same key `CatalogScopeService` reads before the first catalog
	 * query, holding the same document. One choice, one place: with a key
	 * each, the copy this layer restores could disagree with the one the
	 * sync layer went by, and which won would come down to which was read
	 * first — here that would mean downloading the wrong genre, or all of
	 * them.
	 */
	storageKey: 'mc-genre-scope',
	toValue: (data) => ({
		genres: Array.isArray(data['genres'])
			? (data['genres'] as unknown[])
					.filter((slug): slug is string => typeof slug === 'string')
					.slice(0, GENRE_SCOPE_LIMIT)
			: null,
	}),
	toDocument: ({ genres }) => ({
		genres: (genres ?? []).slice(0, GENRE_SCOPE_LIMIT),
	}),
};
