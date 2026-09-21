#!/usr/bin/env node
/**
 * Publishes catalog collections as Firestore bundles, so the clients load
 * them from Cloud Storage instead of reading every document.
 *
 *   node tools/sync/build-bundles.mjs [--env dev|prod]
 *     [--collections membership,track] [--confirm]
 *
 * Run it after an import. Per collection it reads every document (one read
 * each), uploads `bundles/{featureKey}/{seconds}.bundle` (gzip) and announces
 * it in `sync/catalog.bundles`. The documents are read as a collection group,
 * like the app lists them, so a nested collection (`artist/{uid}/album`) ends
 * up in its bundle too. The two newest bundles of a collection are
 * kept, so clients still downloading the previous one are not cut off.
 *
 * On the first --confirm run it sets a GET-only CORS rule on the bucket
 * (the browser downloads the bundle with fetch/XHR); storage.rules must allow
 * reading `bundles/`. Without --confirm it only counts the documents. Needs
 * Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import {
	BUNDLE_FEATURE_KEYS,
	BUNDLE_FOLDER,
	announceBundle,
	featureVersion,
} from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const KEPT_BUNDLES = 2;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		collections: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});

const featureKeys = options.collections
	? options.collections
			.split(',')
			.map((key) => key.trim())
			.filter(Boolean)
	: BUNDLE_FEATURE_KEYS;

const { projectId, storageBucket } = await readEnvironment(options.env);

console.log(
	`${projectId}: bundles of ${featureKeys.join(', ')} → gs://${storageBucket}/${BUNDLE_FOLDER}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to publish')
);

initializeApp({ credential: applicationDefault(), projectId, storageBucket });
const db = getFirestore();
const bucket = getStorage().bucket();

if (options.confirm) {
	await ensureCors();
}

for (const featureKey of featureKeys) {
	const modifiedAt = await featureVersion(db, featureKey);

	if (!modifiedAt) {
		console.warn(
			`${featureKey}: no version in sync/catalog, skipped — run touch-catalog first`
		);
		process.exitCode = 1;
		continue;
	}

	if (!options.confirm) {
		const count = await db.collectionGroup(featureKey).count().get();
		console.log(
			`${featureKey}: ${count.data().count} documents (${count.data().count} reads to build)`
		);
		continue;
	}

	// Read after the version: a document written in between is in the bundle
	// and is fetched again as a change, never missed.
	const snapshot = await db.collectionGroup(featureKey).get();
	const content = db
		.bundle(`${featureKey}-${modifiedAt.seconds}`)
		.add(featureKey, snapshot)
		.build();
	const gzipped = gzipSync(content);
	const path = `${BUNDLE_FOLDER}/${featureKey}/${modifiedAt.seconds}.bundle`;

	await bucket.file(path).save(gzipped, {
		resumable: false,
		metadata: {
			contentType: 'application/octet-stream',
			contentEncoding: 'gzip',
			cacheControl: 'public, max-age=31536000, immutable',
		},
	});
	await announceBundle(db, featureKey, {
		path,
		modifiedAt,
		count: snapshot.size,
	});
	console.log(
		`${featureKey}: ${snapshot.size} documents, ${kb(content.length)} → ${kb(gzipped.length)} gzip, ${path}`
	);

	await removeOldBundles(featureKey, path);
}

function kb(bytes) {
	return `${Math.round(bytes / 1024)} KB`;
}

async function removeOldBundles(featureKey, current) {
	const [files] = await bucket.getFiles({
		prefix: `${BUNDLE_FOLDER}/${featureKey}/`,
	});
	const old = files
		.filter((file) => file.name !== current)
		.sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }))
		.slice(KEPT_BUNDLES - 1);

	await Promise.all(old.map((file) => file.delete()));
}

async function ensureCors() {
	const [metadata] = await bucket.getMetadata();
	const allowsGet = (metadata.cors ?? []).some(
		(rule) => rule.origin?.includes('*') && rule.method?.includes('GET')
	);

	if (!allowsGet) {
		await bucket.setCorsConfiguration([
			...(metadata.cors ?? []),
			{ origin: ['*'], method: ['GET'], maxAgeSeconds: 3600 },
		]);
		console.log('bucket CORS: GET allowed from any origin');
	}
}
