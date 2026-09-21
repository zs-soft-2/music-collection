#!/usr/bin/env node
/**
 * Merges the albums one artist holds twice.
 *
 *   node tools/catalog/merge-duplicate-albums.mjs [--env dev|prod]
 *       [--artist UID] [--confirm]
 *
 * `find-duplicate-names.mjs` reports the clashes; this ends them. Of each
 * group the document the rest of the catalog already points at is kept — the
 * one with the pressings under it and the copies on someone's shelf — and the
 * other is taken apart:
 *
 * - fields the keeper is missing (a cover, the Discogs summary, the styles,
 *   the tracklist) are filled in from the loser, and nothing set is overwritten;
 * - the loser's `track` and `contribution` documents go with it: they are the
 *   same tracklist imported a second time, and the keeper has its own;
 * - a `membership` naming the loser is pointed at the keeper instead, without
 *   letting the same album appear twice in `albumUids`;
 * - the album document is deleted with a tombstone, like every other write
 *   made with Admin credentials.
 *
 * A group where two documents both have pressings or owned copies is left
 * alone and reported: moving a collector's copy from one album to another is
 * a judgement call, not a rule. Without `--confirm` nothing is written and
 * the whole plan is printed. Needs Firebase Admin credentials.
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { normalize } from '../discogs/discogs-mapping.mjs';
import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { stamp, tombstone, touchCatalog } from '../sync/catalog-sync.mjs';

/** Firestore takes 500 writes per batch; a tombstone doubles every delete. */
const BATCH_LIMIT = 200;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		artist: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});
const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const database = getFirestore();

/** Nothing the keeper could be missing: null, '' or an empty list. */
function isEmpty(value) {
	return (
		value === null ||
		value === undefined ||
		value === '' ||
		(Array.isArray(value) && value.length === 0)
	);
}

const documents = async (featureKey) =>
	(await database.collectionGroup(featureKey).get()).docs;

const albums = (await documents('album')).map((document) => ({
	uid: document.id,
	reference: document.ref,
	data: document.data(),
}));

/** The albums of one artist that share a title, as groups of two or more. */
function clashingGroups() {
	const byArtist = new Map();

	for (const album of albums) {
		const artistUid = album.data.artist?.uid;

		if (!artistUid || (options.artist && artistUid !== options.artist)) {
			continue;
		}

		byArtist.set(artistUid, [...(byArtist.get(artistUid) ?? []), album]);
	}

	const groups = [];

	for (const list of byArtist.values()) {
		const byName = new Map();

		for (const album of list) {
			const key = normalize(album.data.name ?? '');

			if (key === '') continue;

			byName.set(key, [...(byName.get(key) ?? []), album]);
		}

		groups.push(...[...byName.values()].filter((g) => g.length > 1));
	}

	return groups.sort((a, b) =>
		`${a[0].data.artist?.name} ${a[0].data.name}`.localeCompare(
			`${b[0].data.artist?.name} ${b[0].data.name}`
		)
	);
}

const groups = clashingGroups();

console.log(
	`${projectId}: ${albums.length} albums, ${groups.length} clashing groups`
);

if (!groups.length) {
	process.exit(0);
}

const candidates = new Set(groups.flat().map((album) => album.uid));

/** What the rest of the catalog holds against each album of a group. */
async function collectReferences() {
	const references = new Map(
		[...candidates].map((uid) => [
			uid,
			{
				tracks: [],
				contributions: [],
				memberships: [],
				releases: 0,
				owned: 0,
				wishlist: 0,
			},
		])
	);
	const of = (uid) => (candidates.has(uid) ? references.get(uid) : null);

	for (const document of await documents('track')) {
		of(document.get('albumUid'))?.tracks.push(document.ref);
	}
	for (const document of await documents('contribution')) {
		of(document.get('albumUid'))?.contributions.push(document.ref);
	}
	for (const document of await documents('membership')) {
		for (const uid of document.get('albumUids') ?? []) {
			of(uid)?.memberships.push(document);
		}
	}
	for (const document of await documents('release')) {
		const entry = of(document.ref.parent.parent?.id);

		if (entry) entry.releases += 1;
	}
	for (const document of await documents('collection-item')) {
		const entry = of(document.get('release.album.uid'));

		if (entry) entry.owned += 1;
	}
	for (const document of await documents('wishlist-item')) {
		const entry = of(
			document.get('album.uid') ?? document.get('release.album.uid')
		);

		if (entry) entry.wishlist += 1;
	}

	return references;
}

const references = await collectReferences();

/** Pressings and copies: what cannot be moved to another album by rule. */
const attachments = (album) => {
	const { releases, owned, wishlist } = references.get(album.uid);

	return releases + owned + wishlist;
};

const seconds = (album) => album.data.updatedAt?.seconds ?? 0;

/**
 * The album the catalog already treats as the record: the one the pressings
 * and the collectors' copies hang off, then the one the imports filled in.
 * The oldest decides a tie, so a rerun keeps choosing the same document.
 */
function keeperOf(group) {
	return [...group].sort(
		(a, b) =>
			attachments(b) - attachments(a) ||
			references.get(b.uid).contributions.length -
				references.get(a.uid).contributions.length ||
			references.get(b.uid).memberships.length -
				references.get(a.uid).memberships.length ||
			references.get(b.uid).tracks.length -
				references.get(a.uid).tracks.length ||
			seconds(a) - seconds(b)
	)[0];
}

const describe = (album) => {
	const { tracks, contributions, memberships, releases, owned, wishlist } =
		references.get(album.uid);
	const counts = [
		releases && `${releases} releases`,
		owned && `${owned} owned`,
		wishlist && `${wishlist} wishlist`,
		tracks.length && `${tracks.length} tracks`,
		contributions.length && `${contributions.length} credits`,
		memberships.length && `${memberships.length} memberships`,
	].filter(Boolean);

	return `${album.uid} (${counts.join(', ') || 'nothing attached'})`;
};

/** The keeper's empty fields, filled in from the album being taken apart. */
function missingFields(keeper, loser) {
	return Object.fromEntries(
		Object.entries(loser.data).filter(
			([field, value]) =>
				field !== 'uid' &&
				field !== 'updatedAt' &&
				isEmpty(keeper.data[field]) &&
				!isEmpty(value)
		)
	);
}

const writes = [];
const featureKeys = new Set();
/** Every album taken apart, onto the one kept in its place. */
const replacements = new Map();
/** The membership documents that name one, by path so each is planned once. */
const touchedMemberships = new Map();
let skipped = 0;

for (const group of groups) {
	const title = `${group[0].data.artist?.name} — ${group[0].data.name}`;
	const contested = group.filter((album) => attachments(album) > 0);

	if (contested.length > 1) {
		skipped += 1;
		console.log(`\n${title}: LEFT ALONE, decide by hand`);
		for (const album of contested) {
			console.log(`  both have pressings or copies: ${describe(album)}`);
		}
		continue;
	}

	const keeper = keeperOf(group);
	const losers = group.filter((album) => album !== keeper);

	console.log(`\n${title}`);
	console.log(`  keep   ${describe(keeper)}`);

	const filled = {};

	for (const loser of losers) {
		const { tracks, contributions, memberships } = references.get(
			loser.uid
		);

		console.log(`  merge  ${describe(loser)}`);

		Object.assign(filled, missingFields(keeper, loser));

		for (const reference of [...tracks, ...contributions]) {
			writes.push({ kind: 'delete', reference });
			featureKeys.add(reference.parent.id);
		}
		replacements.set(loser.uid, keeper.uid);
		for (const document of memberships) {
			touchedMemberships.set(document.ref.path, document);
		}
		writes.push({ kind: 'delete', reference: loser.reference });
		featureKeys.add('album');
	}

	const fields = Object.keys(filled);

	if (fields.length) {
		console.log(`  fill   ${fields.join(', ')}`);
		writes.push({
			kind: 'update',
			reference: keeper.reference,
			data: filled,
		});
		featureKeys.add('album');
	}
}

// A line-up can name both albums of a group — and of several groups — so the
// swaps are made in one pass per membership, after every keeper is known.
for (const document of touchedMemberships.values()) {
	const albumUids = [
		...new Set(
			(document.get('albumUids') ?? []).map(
				(uid) => replacements.get(uid) ?? uid
			)
		),
	];

	writes.push({
		kind: 'update',
		reference: document.ref,
		data: {
			albumUids,
			// Kept in step where it was the length of the list; a count an
			// admin corrected by hand is left as it is.
			...(document.get('albumCount') ===
			(document.get('albumUids') ?? []).length
				? { albumCount: albumUids.length }
				: {}),
		},
	});
	featureKeys.add('membership');
}

console.log(
	`\n${groups.length - skipped} groups to merge, ${skipped} left alone` +
		`, ${writes.length} writes over ${[...featureKeys].sort().join(', ') || '—'}`
);

if (!options.confirm) {
	console.log('DRY RUN — add --confirm to write');
	process.exit(0);
}

for (let index = 0; index < writes.length; index += BATCH_LIMIT) {
	const batch = database.batch();

	for (const write of writes.slice(index, index + BATCH_LIMIT)) {
		if (write.kind === 'delete') {
			const stone = tombstone(database, write.reference);

			batch.delete(write.reference);
			batch.set(stone.ref, stone.data);
		} else {
			batch.update(write.reference, stamp(write.data));
		}
	}

	await batch.commit();
	console.log(
		`committed ${Math.min(index + BATCH_LIMIT, writes.length)}/${writes.length}`
	);
}

await touchCatalog(database, [...featureKeys]);

console.log(
	`merged; touched ${[...featureKeys].sort().join(', ')}.` +
		' Rebuild the bundles: node tools/sync/build-bundles.mjs' +
		` --env ${options.env} --confirm`
);
