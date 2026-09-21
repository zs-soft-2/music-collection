#!/usr/bin/env node
/**
 * Copies the prod data (Firestore and Storage) into the dev project.
 *
 *   node tools/sync/copy-prod-to-dev.mjs [--uid prodUid=devUid,...]
 *     [--skip-storage] [--confirm]
 *
 * Prod is only read. Documents keep their ids and are written with
 * `updatedAt` (catalog-sync `stamp`); download URLs pointing to the prod
 * bucket are rewritten to the dev bucket, whose files keep their download
 * tokens. The users have other uids in the dev Auth: `--uid` replaces a prod
 * uid with the dev one in document paths and values. The `sync` collection
 * is not copied: the dev catalog versions are reset at the end, so the
 * clients download everything once. Re-running overwrites the same documents. Without --confirm it only prints counts.
 * Needs Firebase Admin credentials with access to both projects
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import {
	BUNDLE_FOLDER,
	CATALOG_FEATURE_KEYS,
	SYNC_COLLECTION,
	stamp,
	touchCatalog,
} from './catalog-sync.mjs';
import { readEnvironment } from './environment.mjs';

/** Subcollections, copied as collection groups. */
const NESTED_COLLECTIONS = ['album', 'release', 'collection-item', 'wishlist-item'];

const { values: options } = parseArgs({
	options: {
		uid: { type: 'string' },
		'skip-storage': { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
	},
});

const uids = (options.uid ?? '')
	.split(',')
	.filter(Boolean)
	.map((pair) => pair.split('=').map((uid) => uid.trim()));

const source = await projectOf('prod');
const target = await projectOf('dev');

if (source.projectId === target.projectId) {
	throw new Error(`source and target are the same project: ${source.projectId}`);
}

console.log(
	`${source.projectId} → ${target.projectId}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

const sourceDb = getFirestore(source.app);
const targetDb = getFirestore(target.app);

const rootCollections = (await sourceDb.listCollections())
	.map((collection) => collection.id)
	.filter((id) => id !== SYNC_COLLECTION);
const queries = [
	...rootCollections.map((id) => [id, sourceDb.collection(id)]),
	...NESTED_COLLECTIONS.map((id) => [`*/${id}`, sourceDb.collectionGroup(id)]),
];

let failures = 0;

for (const [label, query] of queries) {
	if (!options.confirm) {
		const count = await query.count().get();
		console.log(`${label}: ${count.data().count} documents`);
		continue;
	}

	const writer = targetDb.bulkWriter();
	writer.onWriteError((error) => {
		if (error.failedAttempts < 3) return true;
		failures++;
		console.error(`${error.documentRef.path}: ${error.message}`);
		return false;
	});

	let count = 0;
	for await (const document of query.stream()) {
		writer.set(
			targetDb.doc(replaceUids(document.ref.path)),
			stamp(rewrite(document.data()))
		);
		count++;
	}
	await writer.close();
	console.log(`${label}: ${count} documents`);
}

if (options.confirm) {
	// After the writes: the version must not be older than what it covers.
	await touchCatalog(targetDb, CATALOG_FEATURE_KEYS, { reset: true });
	console.log('sync/catalog: reset');
	// The reset invalidates the bundles: until they are built again every
	// client downloads the copied collections document by document.
	console.log('next: node tools/sync/build-bundles.mjs --env dev --confirm');
}

if (!options['skip-storage']) {
	await copyStorage();
}

if (failures) {
	console.error(`${failures} writes failed`);
	process.exitCode = 1;
}

async function projectOf(env) {
	const { projectId, storageBucket } = await readEnvironment(env);

	return {
		projectId,
		storageBucket,
		app: initializeApp(
			{ credential: applicationDefault(), projectId, storageBucket },
			env
		),
	};
}

function replaceUids(text) {
	return uids.reduce((result, [from, to]) => result.replaceAll(from, to), text);
}

/** Points download URLs to the dev bucket and prod uids to the dev ones. */
function rewrite(value) {
	if (typeof value === 'string') {
		return replaceUids(
			value.replaceAll(
				`/b/${source.storageBucket}/`,
				`/b/${target.storageBucket}/`
			)
		);
	}
	if (Array.isArray(value)) return value.map(rewrite);
	if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, rewrite(item)])
		);
	}
	return value;
}

async function copyStorage() {
	const sourceBucket = getStorage(source.app).bucket();
	const targetBucket = getStorage(target.app).bucket();
	const [files] = await sourceBucket.getFiles();
	const copied = files.filter(
		(file) => !file.name.startsWith(`${BUNDLE_FOLDER}/`)
	);

	if (!options.confirm) {
		const bytes = copied.reduce((sum, file) => sum + Number(file.metadata.size), 0);
		console.log(`storage: ${copied.length} files, ${Math.round(bytes / 1e6)} MB`);
		return;
	}

	let count = 0;
	for (let i = 0; i < copied.length; i += 20) {
		await Promise.all(
			copied.slice(i, i + 20).map(async (file) => {
				const destination = targetBucket.file(file.name);
				const [exists] = await destination.exists();
				if (exists) return;
				// Copies the metadata too, the download token included.
				await file.copy(destination);
				count++;
			})
		);
	}
	console.log(`storage: ${count} files copied, ${copied.length - count} already there`);
}
