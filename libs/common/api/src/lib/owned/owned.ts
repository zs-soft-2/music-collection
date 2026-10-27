/**
 * Where a collector's own entities live.
 *
 * What a collector creates for themselves — a band the shared catalog has
 * never heard of, and in time the records under it — does not go into the
 * catalog. It lives under their own user document, in a collection named
 * after the feature it mirrors: `user/{uid}/owned-artist`, next to
 * `collection-item` and `wishlist-item`.
 *
 * The prefix is not decoration. The name must not be a catalog collection
 * name, because the catalog's collection-group rules
 * (`/{path=**}/artist/{artistId}`) make every `artist` collection readable
 * by everybody at any depth, whoever it belongs to. Keeping the names apart
 * keeps the two worlds apart, and with them the bundles, the counts and
 * everything else fed by a collection-group query over the catalog.
 */
export const USER_COLLECTION = 'user';

export const OWNED_FEATURE_PREFIX = 'owned-';

/** The owned side of a feature key: `artist` → `owned-artist`. */
export const ownedFeatureKey = (featureKey: string): string =>
	`${OWNED_FEATURE_PREFIX}${featureKey}`;

/** The catalog feature an owned key mirrors; null for a catalog key. */
export const catalogFeatureKeyOf = (featureKey: string): string | null =>
	featureKey.startsWith(OWNED_FEATURE_PREFIX)
		? featureKey.slice(OWNED_FEATURE_PREFIX.length)
		: null;

/** Path of a collector's own collection: `user/{uid}/owned-{feature}`. */
export const ownedCollectionPath = (
	uid: string,
	featureKey: string
): [string, string, string] => [
	USER_COLLECTION,
	uid,
	ownedFeatureKey(featureKey),
];
