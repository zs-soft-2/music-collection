#!/usr/bin/env node
/**
 * Takes the download URLs out of the copy documents and changes the locks on
 * the pictures they pointed at.
 *
 *   node tools/sync/reseal-copy-photos.mjs [--env dev|prod] [--confirm]
 *
 * A Storage download URL carries a token, and that token opens the file to
 * whoever holds the link: no login, and past every Storage rule. Copy photos
 * were written into the collection item with their URL next to the path, and
 * the collection item was readable by anyone until the rules were tightened —
 * so every picture taken before that has to be treated as a link that may
 * already be in a stranger's hands.
 *
 * Hence two moves, and both are needed. The field goes, so no document hands
 * out a key again (the rules refuse to take one from now on, and the app asks
 * Storage for the URL when it shows a picture). The token is replaced, so the
 * links that were handed out stop working — without it, dropping the field
 * would only hide a key that still turns.
 *
 * The order matters, because an update is judged on the whole document it
 * would leave behind: once the rules refuse a `url`, every write to a copy
 * that still carries one is refused with it — a place on the shelf, a grade,
 * a sale. So: deploy the app first (it writes no URL and asks Storage where
 * to read the pictures from), run this, and deploy the rules last.
 *
 * Without --confirm it reads and prints what it would do. Every collection
 * item is read once, the dry run included. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

/** Firestore takes at most 500 writes in one batch. */
const BATCH_SIZE = 400;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId, storageBucket } = await readEnvironment(options.env);

initializeApp({
	credential: applicationDefault(),
	projectId,
	storageBucket,
});

const db = getFirestore();
const bucket = getStorage().bucket(storageBucket);
const snapshot = await db.collectionGroup('collection-item').get();

/** Documents whose photos still carry a URL, and every path ever pictured. */
const pending = [];
const paths = new Set();

snapshot.forEach((document) => {
	const photos = document.data().photos;

	if (!Array.isArray(photos) || !photos.length) {
		return;
	}

	photos.forEach((photo) => {
		if (typeof photo?.path === 'string' && photo.path) {
			paths.add(photo.path);
		}
	});

	if (photos.some((photo) => photo && 'url' in photo)) {
		pending.push({
			ref: document.ref,
			photos: photos.map(({ path, width, height }) => ({
				path,
				width,
				height,
			})),
		});
	}
});

console.log(
	`${projectId}: ${snapshot.size} collection items read, ` +
		`${pending.length} still carry a download URL, ` +
		`${paths.size} pictures to be relocked` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

if (!options.confirm) {
	[...paths].slice(0, 10).forEach((path) => console.log(`    ${path}`));
	process.exit(0);
}

// The token first. A document without the field but with the old token still
// live would read as done while the leaked link kept working.
let relocked = 0;
let missing = 0;

for (const path of paths) {
	const file = bucket.file(path);

	try {
		await file.setMetadata({
			metadata: { firebaseStorageDownloadTokens: randomUUID() },
		});
		relocked += 1;
	} catch (error) {
		// A picture the document points at but Storage no longer holds: the
		// document is the thing to fix, and the loop below does that.
		if (error.code === 404) {
			missing += 1;
		} else {
			throw error;
		}
	}
}

console.log(
	`  ${relocked} pictures relocked` +
		(missing ? `, ${missing} no longer in Storage` : '')
);

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, photos }) => batch.update(ref, stamp({ photos })));

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`
	);
}

if (pending.length) {
	await touchCatalog(db, ['collection-item']);
	console.log('collection-item touched');
}
