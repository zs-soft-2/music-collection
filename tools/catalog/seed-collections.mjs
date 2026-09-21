#!/usr/bin/env node
/**
 * Writes a handful of example abstract collections into the catalog.
 *
 *   node tools/catalog/seed-collections.mjs [--env dev|prod] [--confirm]
 *
 * The app writes a definition through the `createMusicCollectionEntity`
 * callable, which needs a signed-in admin; a seeding script has no session,
 * so it writes with Firebase Admin like the rest of `tools/` — through the
 * sync wrapper, so the clients' caches learn about it.
 *
 * The document id is the slug. That makes the script safe to re-run: a
 * collection already there is left alone (`--force` overwrites it, keeping
 * the date it was created and raising `criteriaVersion` when the rule
 * changed, exactly as the callable would).
 *
 * The rules below are written against what the catalog actually holds, so
 * every one of them resolves to records. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { stamp, touchCatalog } from '../sync/catalog-sync.mjs';

const FEATURE_KEY = 'music-collection';
/** `libs/common/api` EntityTypeEnum.MusicCollection. */
const ENTITY_TYPE = 'Music Collection';
const LP = { includesAny: ['lp'] };

/** Iron Maiden in the dev catalog; the artist criterion matches by uid. */
const IRON_MAIDEN_UID = 'VtIq9R7sFwP8mdNQy2s9';

const badge = (name, description, icon) => ({
	name,
	description,
	icon,
	artworkUrl: null,
});

/**
 * Ten collections of different sizes and ages, so the pages have something
 * to show: a tree, a draft, curated and derived scores, and rules that reach
 * from thirteen records to a hundred and fifty.
 */
const COLLECTIONS = [
	{
		name: 'The Thrash Scenes',
		slug: 'thrash-scenes',
		description:
			'Thrash as it was played while it was being invented: the Bay Area, the Teutonic scene and everything around them, 1983 to 1991.',
		icon: 'pi pi-bolt',
		criteria: {
			styles: {
				includesAny: ['Thrash', 'Bay Area Thrash', 'Teutonic Thrash'],
			},
			years: { from: 1983, to: 1991 },
			albumFormats: LP,
		},
		badge: badge(
			'Thrash Historian',
			'Own every studio album of the first thrash decade.',
			'pi pi-bolt'
		),
	},
	{
		name: 'Bay Area Thrash 1985–1990',
		slug: 'bay-area-thrash',
		description:
			'The San Francisco scene at its peak — Testament, Exodus, Death Angel, Forbidden, Vio-lence and the rest.',
		icon: 'pi pi-map',
		parentSlug: 'thrash-scenes',
		criteria: {
			styles: { includesAny: ['Bay Area Thrash'] },
			years: { from: 1985, to: 1990 },
			albumFormats: LP,
		},
		badge: badge(
			'Bay Area Veteran',
			'Every studio album of the Bay Area, 1985 to 1990.',
			'pi pi-map'
		),
	},
	{
		name: 'Teutonic Thrash',
		slug: 'teutonic-thrash',
		description:
			'The German answer: Kreator, Sodom, Destruction and the scene they dragged along with them.',
		icon: 'pi pi-flag',
		parentSlug: 'thrash-scenes',
		criteria: {
			styles: { includesAny: ['Teutonic Thrash'] },
			albumFormats: LP,
		},
		badge: badge(
			'Teutonic Storm',
			'Every Teutonic thrash studio album in the catalog.',
			'pi pi-flag'
		),
	},
	{
		name: 'The New Wave of British Heavy Metal',
		slug: 'nwobhm',
		description:
			'Where most of this came from: the British wave of 1979 to 1984, back when the records were pressed once and never again.',
		icon: 'pi pi-star',
		// A curated score: small, but the hardest records here to find.
		basePoints: 400,
		criteria: {
			styles: { includesAny: ['New Wave Of British Heavy Metal'] },
			years: { from: 1979, to: 1984 },
			albumFormats: LP,
		},
		badge: badge(
			'New Wave Rider',
			'Own the British wave that started it all.',
			'pi pi-star'
		),
	},
	{
		name: 'The Gothenburg Sound',
		slug: 'gothenburg-sound',
		description:
			'Melodic death metal as Sweden wrote it between 1993 and 2000.',
		icon: 'pi pi-compass',
		criteria: {
			styles: { includesAny: ['Gothenburg'] },
			years: { from: 1993, to: 2000 },
			albumFormats: LP,
		},
		badge: badge(
			'Gothenburg Native',
			'Every Gothenburg studio album of the nineties.',
			'pi pi-compass'
		),
	},
	{
		name: 'Power Metal in the Nineties',
		slug: 'power-metal-nineties',
		description:
			'Ten years of double bass drums and high notes, 1990 to 1999.',
		icon: 'pi pi-shield',
		criteria: {
			styles: { includesAny: ['Power metal'] },
			years: { from: 1990, to: 1999 },
			albumFormats: LP,
		},
		badge: badge(
			'Power Chord',
			'Every power metal studio album of the nineties.',
			'pi pi-shield'
		),
	},
	{
		name: 'Doom',
		slug: 'doom',
		description:
			'Slow, heavy and long: doom, death doom and gothic doom, whenever they were made.',
		icon: 'pi pi-clock',
		criteria: {
			styles: { includesAny: ['Doom', 'Death Doom', 'Gothic Doom'] },
			albumFormats: LP,
		},
		badge: badge(
			'The Long Way Down',
			'Own every doom studio album in the catalog.',
			'pi pi-clock'
		),
	},
	{
		name: 'The Seventies',
		slug: 'the-seventies',
		description:
			'Everything the catalog holds from 1970 to 1979 — the decade where an original pressing is worth the most.',
		icon: 'pi pi-history',
		// Curated: fifty years old, and priced for it.
		basePoints: 1200,
		criteria: {
			years: { from: 1970, to: 1979 },
			albumFormats: LP,
		},
		badge: badge(
			'Seventies Survivor',
			'Own every seventies studio album in the catalog.',
			'pi pi-history'
		),
	},
	{
		name: 'Iron Maiden on Vinyl',
		slug: 'iron-maiden',
		description:
			'The studio albums of Iron Maiden — a discography rather than a scene, and the shortest way to a badge.',
		icon: 'pi pi-user',
		criteria: {
			artists: { includesAny: [IRON_MAIDEN_UID] },
			albumFormats: LP,
		},
		badge: badge(
			'Up the Irons',
			'Every Iron Maiden studio album.',
			'pi pi-user'
		),
	},
	{
		name: 'Glam Metal',
		slug: 'glam-metal',
		description:
			'Hairspray and choruses. Left as a draft on purpose: it is not published, so nobody can earn it yet.',
		icon: 'pi pi-sparkles',
		status: 'draft',
		criteria: {
			styles: { includesAny: ['Glam Metal', 'Glam Rock'] },
			albumFormats: LP,
		},
		badge: badge(
			'Hair and Hooks',
			'Own every glam studio album in the catalog.',
			'pi pi-sparkles'
		),
	},
];

/** Key order does not change a rule; this is what tells a real change. */
function fingerprint(value) {
	if (Array.isArray(value)) {
		return `[${value.map(fingerprint).join(',')}]`;
	}
	if (typeof value !== 'object' || value === null) {
		return JSON.stringify(value) ?? 'null';
	}
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${key}:${fingerprint(value[key])}`)
		.join(',')}}`;
}

function toDocument(definition, previous) {
	const { parentSlug, ...rest } = definition;
	const changed =
		previous &&
		fingerprint(previous.criteria ?? {}) !== fingerprint(rest.criteria);

	return {
		entityType: ENTITY_TYPE,
		uid: rest.slug,
		coverImageUrl: null,
		basePoints: null,
		status: 'published',
		visibility: 'public',
		...rest,
		parentUid: parentSlug ?? null,
		createdAt: previous?.createdAt ?? Date.now(),
		criteriaVersion: changed ? (previous.criteriaVersion ?? 1) + 1 : 1,
	};
}

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
		force: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
const collection = db.collection(FEATURE_KEY);
const existing = new Map(
	(await collection.get()).docs.map((document) => [
		document.id,
		document.data(),
	])
);

console.log(`${projectId}: ${FEATURE_KEY}`);

const writes = [];

for (const definition of COLLECTIONS) {
	const previous = existing.get(definition.slug);

	if (previous && !options.force) {
		console.log(`  skip    ${definition.slug} (already there)`);
		continue;
	}

	const document = toDocument(definition, previous);

	writes.push(document);
	console.log(
		`  ${previous ? 'update' : 'create'}  ${definition.slug}` +
			` — ${document.name}` +
			(document.status === 'draft' ? ' [draft]' : '') +
			(document.basePoints ? ` ${document.basePoints} pts` : '')
	);
}

if (!writes.length) {
	console.log('nothing to write');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — ${writes.length} document(s); add --confirm`);
	process.exit(0);
}

const batch = db.batch();

for (const document of writes) {
	batch.set(collection.doc(document.uid), stamp(document));
}

await batch.commit();
await touchCatalog(db, [FEATURE_KEY]);

console.log(`written ${writes.length}, ${FEATURE_KEY} touched`);
