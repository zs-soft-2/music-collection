/**
 * Reads a published catalog bundle back from Cloud Storage, so a script can
 * go over a whole collection without paying a document read for every row.
 *
 * The bundles are what the clients already load (`FirestoreSyncService`,
 * libs/api), built by `build-bundles.mjs` from the same collection-group
 * queries the app lists with. Downloading one is a Storage GET: no reads,
 * whatever the collection's size.
 *
 * A bundle is a snapshot, so a caller that needs the collection as it
 * stands now asks the server for what changed after it — see
 * `readFeatureDocuments`, which is the whole dance: bundle, then the
 * handful of documents written since, then the tombstones of the ones
 * deleted since.
 *
 * Format: length-prefixed JSON elements, the length in bytes as decimal
 * ASCII. The elements are `metadata`, `namedQuery`, `documentMetadata` and
 * `document`, and the fields are REST-style values (`{"stringValue": …}`).
 * A time comes as `{seconds, nanos}` rather than the RFC 3339 string the
 * REST API would give, so both are read.
 */

import { gunzipSync } from 'node:zlib';

import { Timestamp } from 'firebase-admin/firestore';

import {
	DELETION_COLLECTION,
	SYNC_COLLECTION,
	UPDATED_AT_FIELD,
} from './catalog-sync.mjs';

/** The path of a document as Firestore names it: everything after documents/. */
const pathOf = (name) => name.slice(name.indexOf('/documents/') + 11);

/** A bundled time, written either way, as the Timestamp a query compares to. */
const toTimestamp = (time) =>
	typeof time === 'string'
		? Timestamp.fromDate(new Date(time))
		: new Timestamp(Number(time.seconds ?? 0), Number(time.nanos ?? 0));

/** One REST-style field value as plain JavaScript. */
export function decodeValue(value) {
	if (!value || typeof value !== 'object') return null;

	if ('stringValue' in value) return value.stringValue;
	if ('booleanValue' in value) return value.booleanValue;
	if ('integerValue' in value) return Number(value.integerValue);
	if ('doubleValue' in value) return value.doubleValue;
	if ('nullValue' in value) return null;
	if ('timestampValue' in value) return toTimestamp(value.timestampValue);
	if ('referenceValue' in value) return pathOf(value.referenceValue);
	if ('mapValue' in value) return decodeFields(value.mapValue.fields);
	if ('arrayValue' in value) {
		return (value.arrayValue.values ?? []).map(decodeValue);
	}

	// Bytes and geo points: no script wants them, and guessing would lie.
	return null;
}

/** A document's fields as plain JavaScript. */
export function decodeFields(fields) {
	return Object.fromEntries(
		Object.entries(fields ?? {}).map(([key, value]) => [
			key,
			decodeValue(value),
		])
	);
}

/** The documents of a bundle by their path, in the order they were written. */
export function parseBundle(buffer) {
	const documents = new Map();
	let at = 0;

	while (at < buffer.length) {
		let digits = at;

		while (buffer[digits] >= 0x30 && buffer[digits] <= 0x39) {
			digits += 1;
		}

		const length = Number(buffer.toString('utf8', at, digits));

		if (digits === at || !Number.isSafeInteger(length)) {
			throw new Error(`bundle is malformed at byte ${at}`);
		}

		const element = JSON.parse(
			buffer.toString('utf8', digits, digits + length)
		);

		at = digits + length;

		if (element.document) {
			const path = pathOf(element.document.name);

			documents.set(path, decodeFields(element.document.fields));
		}
	}

	return documents;
}

/** The bundle at that path, downloaded and parsed. No document reads. */
export async function readBundle(bucket, path) {
	const [content] = await bucket.file(path).download();
	// Storage usually unzips what it stored with `contentEncoding: gzip`,
	// but not always — the magic number is what settles it.
	const buffer =
		content[0] === 0x1f && content[1] === 0x8b
			? gunzipSync(content)
			: content;

	return parseBundle(buffer);
}

/**
 * A whole catalog feature as it stands now: its bundle, plus the documents
 * written after the bundle was built, less the ones deleted after it.
 *
 * `catalog` is the `sync/catalog` snapshot (one read, the caller's).
 *
 * A bundle built before the feature was last reset is not usable: a reset
 * is how a bulk edit says that documents changed without their `updatedAt`
 * saying so, which is exactly what catching up relies on. The clients drop
 * such a bundle too (`catchUpWithBundle`).
 *
 * With no usable bundle it refuses rather than quietly reading the whole
 * collection — the refusal says how many documents that would be (one
 * cheap aggregation), and `readAll` is how a caller agrees to pay it.
 *
 * A bundle far behind the collection is refused for the same reason: the
 * delta is read a document at a time, so a bundle months old costs nearly
 * what reading everything costs. `catchUp` is the delta a caller takes
 * without asking; past it the answer is to rebuild the bundle, which the
 * clients want anyway — they download that same delta on every cold start.
 *
 * Returns `{ documents, reads, source }` — the documents by path, how many
 * document reads it took, and where the bulk came from.
 */
export async function readFeatureDocuments(
	db,
	bucket,
	featureKey,
	catalog,
	{ readAll = false, catchUp = 1000 } = {}
) {
	const bundle = catalog.get(`bundles.${featureKey}`) ?? null;
	const resetAt = catalog.get(`resetAt.${featureKey}`) ?? null;
	const group = db.collectionGroup(featureKey);
	const reset =
		!!bundle?.modifiedAt &&
		!!resetAt &&
		resetAt.toMillis() > bundle.modifiedAt.toMillis();
	const unusable = !bundle?.path
		? 'no bundle is published for it'
		: reset
			? 'its bundle was built before the last reset'
			: null;

	if (unusable) {
		if (!readAll) {
			const count = (await group.count().get()).data().count;

			throw new Error(
				`${featureKey}: ${unusable}. Build one with ` +
					'`node tools/sync/build-bundles.mjs --confirm`, or pass ' +
					`--read-all to read the ${count} documents instead.`
			);
		}

		const snapshot = await group.get();
		const documents = new Map();

		snapshot.forEach((document) =>
			documents.set(document.ref.path, document.data())
		);

		return {
			documents,
			reads: snapshot.size,
			source: `collection — ${unusable}`,
		};
	}

	const documents = await readBundle(bucket, bundle.path);
	const since = bundle.modifiedAt;
	// Where the delta is asked from: a root collection as itself, a nested
	// one (`artist/{uid}/album`) as the collection group it was bundled as.
	// The group form of the same filter wants a COLLECTION_GROUP index on
	// `updatedAt`, which only the nested collections have — Firestore
	// refuses the query outright without it. An empty bundle says nothing
	// about the shape, so the group form is assumed and will say so.
	const nested =
		!documents.size ||
		[...documents.keys()].some((path) => path.split('/').length > 2);
	const scope = nested ? group : db.collection(featureKey);
	const delta = scope.where(UPDATED_AT_FIELD, '>', since);
	const behind = (await delta.count().get()).data().count;

	if (behind > catchUp) {
		throw new Error(
			`${featureKey}: its bundle is ${behind} documents behind ` +
				`(built ${bundle.modifiedAt.toDate().toISOString().slice(0, 10)}). ` +
				'Rebuild it with `node tools/sync/build-bundles.mjs --confirm` ' +
				'— every cold client reads that delta too — or pass ' +
				'--catch-up to read it here.'
		);
	}

	const [changed, deleted] = await Promise.all([
		delta.get(),
		db
			.collection(SYNC_COLLECTION)
			.doc(featureKey)
			.collection(DELETION_COLLECTION)
			.where('deletedAt', '>', since)
			.get(),
	]);

	changed.forEach((document) =>
		documents.set(document.ref.path, document.data())
	);
	deleted.forEach((tombstone) => documents.delete(tombstone.get('path')));

	return {
		documents,
		reads: changed.size + deleted.size,
		source: `bundle ${bundle.path}`,
	};
}
