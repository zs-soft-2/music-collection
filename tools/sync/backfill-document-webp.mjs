#!/usr/bin/env node
/**
 * Re-encodes the PNG pictures under `document/` as WebP, in place.
 *
 *   node tools/sync/backfill-document-webp.mjs [--env dev|prod]
 *     [--read-all] [--catch-up] [--confirm]
 *
 * The image models answer with PNG, and until the functions learned to
 * re-encode (`apps/functions/src/document-file.ts`) every badge, scene and
 * track picture went up as one: 1.6 MB on average, 3 MB at most, several of
 * them on the home page at once. Lighthouse counted that as the largest
 * single cost of the page.
 *
 * The object keeps its path and its download token, so every URL already
 * written into the catalog — a collection's cover, a badge gallery, a
 * track's pictures — goes on pointing at the same address, now answered
 * with the smaller file. Only the `fileType` of the document filed over it
 * changes, written through the catalog stamp like every other catalog write.
 *
 * Nothing is lost: before an object is overwritten, its original is copied
 * to `document-png-backup/` under the same name. A browser that already
 * cached the PNG under its immutable header keeps showing that one, which
 * is the same picture.
 *
 * Without --confirm it downloads, encodes and prints what it would save,
 * and writes nothing. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

import { readFeatureDocuments } from './bundle-reader.mjs';
import {
	CATALOG_SYNC_DOCUMENT,
	SYNC_COLLECTION,
	stamp,
	touchCatalog,
} from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const DOCUMENT_FOLDER = 'document/';
const BACKUP_FOLDER = 'document-png-backup/';
/** The same limits `document-file.ts` encodes new pictures with. */
const MAX_EDGE = 2048;
const WEBP_QUALITY = 82;
/** Firestore takes at most 500 writes in one batch. */
const BATCH_SIZE = 400;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		'read-all': { type: 'boolean', default: false },
		'catch-up': { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId, storageBucket } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId, storageBucket });

const db = getFirestore();
const bucket = getStorage().bucket();

const [files] = await bucket.getFiles({ prefix: DOCUMENT_FOLDER });
const pngs = files.filter((file) => file.metadata.contentType === 'image/png');

const catalog = await db
	.collection(SYNC_COLLECTION)
	.doc(CATALOG_SYNC_DOCUMENT)
	.get();
let documents;

try {
	documents = await readFeatureDocuments(db, bucket, 'document', catalog, {
		readAll: options['read-all'],
		catchUp: options['catch-up'] ? Infinity : undefined,
	});
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

/** The documents filed over an object, found by the path in their URL. */
function documentsOver(storagePath) {
	const encoded = `/o/${encodeURIComponent(storagePath)}?`;

	return [...documents.documents]
		.filter(([, document]) => String(document.filePath ?? '').includes(encoded))
		.map(([path]) => path);
}

console.log(
	`${projectId}: ${pngs.length} PNG under ${DOCUMENT_FOLDER}, ` +
		`${documents.documents.size} documents (${documents.source})` +
		(options.confirm ? '' : '\n\nDRY RUN — add --confirm to write')
);

let before = 0;
let after = 0;
const retyped = [];

for (const file of pngs) {
	const [original] = await file.download();
	const webp = await sharp(original)
		.resize({
			width: MAX_EDGE,
			height: MAX_EDGE,
			fit: 'inside',
			withoutEnlargement: true,
		})
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();
	const over = documentsOver(file.name);

	if (webp.byteLength >= original.byteLength) {
		console.log(`  kept     ${file.name} (WebP would not be smaller)`);
		continue;
	}

	before += original.byteLength;
	after += webp.byteLength;
	console.log(
		`  ${options.confirm ? 'written ' : 'would do'} ${file.name} ` +
			`${(original.byteLength / 1024) | 0} KB → ${(webp.byteLength / 1024) | 0} KB` +
			` (${over.length} document)`
	);

	if (!options.confirm) {
		retyped.push(...over);
		continue;
	}

	await file.copy(bucket.file(BACKUP_FOLDER + file.name.slice(DOCUMENT_FOLDER.length)));
	await file.save(webp, {
		contentType: 'image/webp',
		metadata: {
			cacheControl:
				file.metadata.cacheControl ?? 'public, max-age=31536000, immutable',
			// The download token: without it the URLs in the catalog stop working.
			metadata: file.metadata.metadata ?? {},
		},
	});
	retyped.push(...over);
}

console.log(
	`\n  ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB, ` +
		`${retyped.length} document(s) to say image/webp`
);

if (!options.confirm || !retyped.length) {
	process.exit(0);
}

for (let from = 0; from < retyped.length; from += BATCH_SIZE) {
	const batch = db.batch();

	retyped
		.slice(from, from + BATCH_SIZE)
		.forEach((path) =>
			batch.update(db.doc(path), stamp({ fileType: 'image/webp' }))
		);

	await batch.commit();
}

await touchCatalog(db, ['document']);
console.log('document touched');
