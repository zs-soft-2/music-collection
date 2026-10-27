/**
 * What the Discogs scripts share when they write to the catalog: the genre
 * taxonomy they check styles against, and the fill-in-only write that creates
 * missing documents through the sync wrapper and never touches the others.
 */

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';

export { ENV_OPTION };

/** "Post-Rock" → "post rock": the form two spellings are compared in. */
export const normalizeName = (name) =>
	String(name ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/**
 * The taxonomy as the admin page keeps it (`genre/{slug}`): the styles by
 * their normalized form ("post rock" → "Post-Rock"), and the genre each one
 * belongs to. It is read from Firestore even for a dry run — which styles
 * exist is data now, not a list in this repository.
 */
export async function catalogTaxonomy(db) {
	const styles = new Map();
	const genres = new Map();

	for (const document of (await db.collection('genre').get()).docs) {
		const genre = document.data();

		genres.set(normalizeName(genre.name), genre.name);
		for (const style of genre.styles ?? []) {
			if (!styles.has(normalizeName(style))) {
				styles.set(normalizeName(style), {
					style,
					genre: genre.name,
				});
			}
		}
	}

	return { styles, genres };
}

/** Discogs styles the taxonomy knows; the unknown ones land in `dropped`. */
export function mapStyles(styles, known, dropped) {
	const mapped = [];

	for (const style of styles) {
		const hit = known.get(normalizeName(style));

		if (hit) {
			if (!mapped.includes(hit.style)) mapped.push(hit.style);
		} else {
			dropped.add(style);
		}
	}
	return mapped;
}

export async function openFirestore(env) {
	const { initializeApp, applicationDefault } =
		await import('firebase-admin/app');
	const { getFirestore } = await import('firebase-admin/firestore');
	const { projectId } = await readEnvironment(env);

	initializeApp({ credential: applicationDefault(), projectId });
	return getFirestore();
}

/** Creates the documents that do not exist yet; never touches the others. */
export async function createMissing(db, items) {
	const snaps = items.length
		? await db.getAll(...items.map((item) => item.ref))
		: [];
	const missing = items.filter((_, index) => !snaps[index].exists);

	return { ops: missing.map((item) => ({ type: 'create', ...item })) };
}

/**
 * Writes the operations through the sync wrapper: every document gets its
 * `updatedAt`, and the features' version is bumped afterwards, so the clients
 * notice the new documents.
 */
export async function writeOps(db, ops) {
	const { featureKeyOf, stamp, touchCatalog } =
		await import('../sync/catalog-sync.mjs');
	const writer = db.bulkWriter();
	const failures = [];

	writer.onWriteError((error) => {
		const fatal = [7, 8].includes(error.code);
		if (fatal || error.failedAttempts >= 3) {
			failures.push(`${error.documentRef.path}: ${error.message}`);
			return false;
		}
		return true;
	});
	for (const op of ops) {
		writer.create(op.ref, stamp(op.data));
	}
	await writer.close();
	// After the writes: the version must not be older than what it covers.
	await touchCatalog(db, [...new Set(ops.map((op) => featureKeyOf(op.ref)))]);

	return failures;
}
