/**
 * Keeps the client cache (FirestoreSyncService in libs/api) informed about
 * writes made with Firebase Admin. Mirrors the app's write rules:
 * - every written document gets `updatedAt` (server time),
 * - a deleted document leaves a tombstone in `sync/{featureKey}/deletion`,
 * - after writing, `sync/catalog.modifiedAt.{featureKey}` is bumped.
 * The feature key of a document is its collection id.
 */

import { FieldValue } from 'firebase-admin/firestore';

export const SYNC_COLLECTION = 'sync';
export const CATALOG_SYNC_DOCUMENT = 'catalog';
export const DELETION_COLLECTION = 'deletion';
export const UPDATED_AT_FIELD = 'updatedAt';

/** Collections the app lists; `touch-catalog` resets these by default. */
export const CATALOG_FEATURE_KEYS = [
	'album',
	'artist',
	'collection-item',
	'contribution',
	'document',
	'entity-quantity',
	'label',
	'membership',
	'music-collection',
	'musician',
	'release',
	'release-request',
	'track',
	'user',
	'wishlist-item',
];

export const stamp = (data) => ({
	...data,
	[UPDATED_AT_FIELD]: FieldValue.serverTimestamp(),
});

export const featureKeyOf = (ref) => ref.parent.id;

export function tombstone(db, ref) {
	return {
		ref: db
			.collection(SYNC_COLLECTION)
			.doc(featureKeyOf(ref))
			.collection(DELETION_COLLECTION)
			.doc(ref.path.split('/').join('~')),
		data: { path: ref.path, deletedAt: FieldValue.serverTimestamp() },
	};
}

/**
 * Bumps the features' version. Call it after the documents are written, so
 * the version is never older than a document it covers. With `reset` the
 * clients download the features in full (for edits made without `updatedAt`,
 * e.g. in the Firebase console).
 */
export async function touchCatalog(db, featureKeys, { reset = false } = {}) {
	if (!featureKeys.length) return;

	const now = FieldValue.serverTimestamp();
	const times = Object.fromEntries(featureKeys.map((key) => [key, now]));

	await db
		.collection(SYNC_COLLECTION)
		.doc(CATALOG_SYNC_DOCUMENT)
		.set(
			reset
				? { modifiedAt: times, resetAt: times }
				: { modifiedAt: times },
			{ merge: true }
		);
}

/** Collections served to the clients as Firestore bundles by default. */
/**
 * The general catalog, published as bundles: a client loads them from Cloud
 * Storage instead of reading every document. What belongs to one collector
 * (collection-item, wishlist-item) is synced per user instead, and cached
 * the same way.
 */
export const BUNDLE_FEATURE_KEYS = [
	'album',
	'artist',
	'contribution',
	'membership',
	'music-collection',
	'track',
];
/** Storage folder of the bundles: `bundles/{featureKey}/{seconds}.bundle`. */
export const BUNDLE_FOLDER = 'bundles';

/** The feature's version (`sync/catalog.modifiedAt`), or null. */
export async function featureVersion(db, featureKey) {
	const catalog = await db
		.collection(SYNC_COLLECTION)
		.doc(CATALOG_SYNC_DOCUMENT)
		.get();

	return catalog.get(`modifiedAt.${featureKey}`) ?? null;
}

/**
 * Announces a published bundle in `sync/catalog.bundles.{featureKey}`. The
 * bundle holds every document of the feature as of `modifiedAt`; clients load
 * it instead of downloading the documents and fetch only the later changes.
 * The feature's version is left as it is: no document changed.
 */
export async function announceBundle(
	db,
	featureKey,
	{ path, modifiedAt, count }
) {
	await db
		.collection(SYNC_COLLECTION)
		.doc(CATALOG_SYNC_DOCUMENT)
		.set(
			{
				bundles: {
					[featureKey]: {
						path,
						modifiedAt,
						count,
						builtAt: FieldValue.serverTimestamp(),
					},
				},
			},
			{ merge: true }
		);
}
