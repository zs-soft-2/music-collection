/**
 * A napi kérdés összeállítása: az anyag a Firestore-ból, a kész kérdés vissza
 * a Firestore-ba. A kérdést magát a `daily-question.ts` motorja építi.
 *
 * Az anyaggyűjtés szándékosan szűk: egy véletlen album és a szomszédsága
 * (számok, kiadások, az előadó többi lemeze), nem a katalógus végigolvasása.
 * Naponta egyszer fut, néhány tucat olvasással.
 */

import { FieldPath, Firestore, Query } from 'firebase-admin/firestore';

import { stamp } from './catalog-sync';
import {
	MaterialAlbum,
	MaterialArtist,
	MaterialRelease,
	MaterialTrack,
	QuestionDifficulty,
	QuestionMaterial,
	buildQuestion,
	createRandom,
	difficultyForDay,
	gameDay,
	hashSeed,
	pick,
	previousDay,
	toAnswerDocument,
	toQuestionDocument,
	yearOf,
} from './daily-question';

export const DAILY_QUESTION_COLLECTION = 'daily-question';
/** A megfejtés alkollekciója; a szabályok nem engedik olvasni. */
export const ANSWER_COLLECTION = 'secret';
export const ANSWER_DOCUMENT = 'answer';

/**
 * A katalógus nem lapos: az album az előadó alatt él, a kiadás az album
 * alatt (`artist/{a}/album/{b}/release/{c}`). Csak az előadó és a szám áll a
 * gyökérben — a szám az `albumUid` mezővel hivatkozik az albumára.
 */
const ALBUM_COLLECTION = 'album';
const ARTIST_COLLECTION = 'artist';
const RELEASE_COLLECTION = 'release';
const TRACK_COLLECTION = 'track';

/** Egy kiadás útvonala; a collection-group kurzorhoz kell, ami teljes út. */
export const releasePath = (key: string): string =>
	`${ARTIST_COLLECTION}/${key}/${ALBUM_COLLECTION}/${key}/${RELEASE_COLLECTION}/${key}`;

/**
 * Ennyiszer húzunk másik albumot, ha az előzőből egyetlen sablon sem tudott
 * kérdést építeni (üres tracklista, ismeretlen év). Egy húzás néhány tucat
 * olvasás, és naponta egyszer fut.
 */
export const MAX_TRIES = 4;
/** Egy album tracklistája ennél hosszabb nem szokott lenni. */
const TRACK_LIMIT = 60;
/** Ennyi kiadást nézünk az albumhoz, és ennyit a hamis válaszokhoz. */
const RELEASE_LIMIT = 20;
const SIBLING_LIMIT = 12;
const DISTRACTOR_LIMIT = 8;

// ── Anyaggyűjtés ────────────────────────────────────────────────────────────

const AUTO_ID_ALPHABET =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const AUTO_ID_LENGTH = 20;

/** Firestore-szerű azonosító a véletlen húzáshoz. */
export function randomKey(random: () => number): string {
	let key = '';

	for (let index = 0; index < AUTO_ID_LENGTH; index++) {
		key += AUTO_ID_ALPHABET[Math.floor(random() * AUTO_ID_ALPHABET.length)];
	}

	return key;
}

/**
 * Véletlen dokumentumok egy kollekcióból: egy húzott azonosítótól kezdve
 * annyi, amennyi kell — a kollekció végén a lista elejére fordulva. Egy-két
 * olvasás, nem a kollekció végigolvasása.
 */
export async function randomDocuments(
	collection: Query,
	random: () => number,
	limit: number
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
	const key = randomKey(random);
	const after = await collection
		.where(FieldPath.documentId(), '>=', key)
		.limit(limit)
		.get();

	if (after.size >= limit) return after.docs;

	const before = await collection
		.where(FieldPath.documentId(), '<', key)
		.limit(limit - after.size)
		.get();

	return [...after.docs, ...before.docs];
}

/**
 * Ugyanaz collection-group lekérdezésre — oda a kurzor nem azonosító, hanem
 * teljes dokumentum-út lehet, mert a rendezés is az útvonal szerint megy.
 * A húzott kulcsból ezért utat építünk; a kollekció végén itt is a lista
 * elejére fordulunk.
 */
export async function randomGroupDocuments(
	database: Firestore,
	group: string,
	path: (key: string) => string,
	random: () => number,
	limit: number
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
	const ordered = database
		.collectionGroup(group)
		.orderBy(FieldPath.documentId());
	const after = await ordered
		.startAt(database.doc(path(randomKey(random))))
		.limit(limit)
		.get();

	if (after.size >= limit) return after.docs;

	const before = await ordered.limit(limit - after.size).get();
	const seen = new Set(after.docs.map((document) => document.ref.path));

	return [
		...after.docs,
		...before.docs.filter((document) => !seen.has(document.ref.path)),
	];
}

const toMaterialAlbum = (
	document: FirebaseFirestore.DocumentSnapshot
): MaterialAlbum => {
	const artist = document.get('artist') as
		{ uid?: string; name?: string } | undefined;

	return {
		uid: document.id,
		name: (document.get('name') as string) ?? '',
		artistUid: artist?.uid ?? null,
		artistName: artist?.name ?? '',
		year: yearOf(document.get('year')),
		styles: (document.get('styles') as string[]) ?? [],
	};
};

/** A `position` a katalógusban hol szöveg („A1”), hol szám (1). */
const toText = (value: unknown): string | null =>
	value === null || value === undefined || value === ''
		? null
		: String(value);

const toMaterialTrack = (
	document: FirebaseFirestore.DocumentSnapshot
): MaterialTrack => ({
	uid: document.id,
	name: (document.get('name') as string) ?? '',
	index: (document.get('index') as number) ?? 0,
	position: toText(document.get('position')),
	durationSec: (document.get('durationSec') as number | null) ?? null,
	releaseUid: (document.get('releaseUid') as string | null) ?? null,
});

const toMaterialRelease = (
	document: FirebaseFirestore.DocumentSnapshot
): MaterialRelease => {
	const label = document.get('label') as { name?: string } | undefined;

	return {
		uid: document.id,
		name: (document.get('name') as string) ?? '',
		catno: (document.get('catno') as string | null) ?? null,
		country: (document.get('country') as string | null) ?? null,
		labelName: label?.name ?? null,
		year: yearOf(document.get('date')),
	};
};

const toMaterialArtist = (
	document: FirebaseFirestore.DocumentSnapshot
): MaterialArtist => ({
	uid: document.id,
	name: (document.get('name') as string) ?? '',
	country: (document.get('country') as string | null) ?? null,
	formedIn: yearOf(document.get('formedIn')),
});

/**
 * Egy véletlen album és a szomszédsága, amiből a sablonok dolgoznak.
 *
 * A húzás az ELŐADÓVAL kezdődik, nem az albummal: az albumok az előadó alatt
 * élnek, a collection-group lekérdezésen pedig az azonosító-tartományos
 * trükk nem megy — ott a kurzor teljes útvonal kell legyen. Az előadó felől
 * ráadásul olcsóbb is: az előadó dokumentuma és a többi lemeze — a hihető
 * évszámokhoz — ugyanabból az egy lekérdezésből megvan.
 *
 * Ha a húzott előadónak nincs albuma, `null`-t adunk: a hívó másik előadót
 * húz, ennyi az egész.
 */
export async function gatherMaterial(
	database: Firestore,
	random: () => number
): Promise<QuestionMaterial | null> {
	const [anchorArtist] = await randomDocuments(
		database.collection(ARTIST_COLLECTION),
		random,
		1
	);

	if (!anchorArtist) return null;

	const albums = await anchorArtist.ref
		.collection(ALBUM_COLLECTION)
		.limit(SIBLING_LIMIT)
		.get();

	if (albums.empty) return null;

	const anchor = pick(albums.docs, random);
	const album = toMaterialAlbum(anchor);
	const [tracks, releases, otherArtists, otherReleases] = await Promise.all([
		database
			.collection(TRACK_COLLECTION)
			.where('albumUid', '==', album.uid)
			.limit(TRACK_LIMIT)
			.get(),
		anchor.ref.collection(RELEASE_COLLECTION).limit(RELEASE_LIMIT).get(),
		randomDocuments(
			database.collection(ARTIST_COLLECTION),
			random,
			DISTRACTOR_LIMIT
		),
		randomGroupDocuments(
			database,
			RELEASE_COLLECTION,
			releasePath,
			random,
			DISTRACTOR_LIMIT
		),
	]);

	return {
		album,
		artist: toMaterialArtist(anchorArtist),
		tracks: tracks.docs.map(toMaterialTrack),
		releases: releases.docs.map(toMaterialRelease),
		siblingAlbums: albums.docs
			.filter((document) => document.id !== anchor.id)
			.map(toMaterialAlbum),
		otherArtists: otherArtists
			.filter((document) => document.id !== anchorArtist.id)
			.map(toMaterialArtist),
		otherReleases: otherReleases
			.filter((document) => document.ref.parent.parent?.id !== album.uid)
			.map(toMaterialRelease),
	};
}

export interface ComposeResult {
	day: string;
	/** Hamis, ha a nap kérdése már megvolt: a futás ilyenkor nem ír. */
	created: boolean;
	templateKey: string | null;
	difficulty: QuestionDifficulty | null;
	/** Ennyi albumot kellett húzni, amíg kérdés lett belőle. */
	tries: number;
}

/** Tegnap melyik sablon jött ki; egy olvasás. */
async function previousTemplateKey(
	database: Firestore,
	day: string
): Promise<string | null> {
	const snapshot = await database
		.collection(DAILY_QUESTION_COLLECTION)
		.doc(previousDay(day))
		.get();

	return (snapshot.get('templateKey') as string) ?? null;
}

/**
 * A nap kérdése. Idempotens: ha a dokumentum megvan, nem ír újra — az
 * ütemezett futás újrapróbálkozása nem cserélheti le a kérdést az alól, aki
 * már válaszolt rá.
 *
 * A `sync/catalog` bumpját szándékosan hagyjuk ki: ez nem cache-elt
 * katalógus-kollekció, a kliens a nap azonosítójával egyetlen dokumentumot
 * olvas. Az `updatedAt` a `stamp`-ből így is rákerül.
 */
export async function composeDailyQuestion(
	database: Firestore,
	options: { day?: string; today?: Date; force?: boolean } = {}
): Promise<ComposeResult> {
	const day = options.day ?? gameDay(options.today ?? new Date());
	const reference = database.collection(DAILY_QUESTION_COLLECTION).doc(day);
	const existing = await reference.get();

	if (existing.exists && !options.force) {
		return {
			day,
			created: false,
			templateKey: (existing.get('templateKey') as string) ?? null,
			difficulty:
				(existing.get('difficulty') as QuestionDifficulty) ?? null,
			tries: 0,
		};
	}

	const random = createRandom(hashSeed(day));
	const preferred = difficultyForDay(day);
	const yesterday = await previousTemplateKey(database, day);

	for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
		const material = await gatherMaterial(database, random);
		const draft = material
			? buildQuestion(material, random, preferred, yesterday)
			: null;

		if (!draft) continue;

		const batch = database.batch();

		batch.set(reference, stamp(toQuestionDocument(day, draft)));
		batch.set(
			reference.collection(ANSWER_COLLECTION).doc(ANSWER_DOCUMENT),
			stamp(toAnswerDocument(day, draft))
		);

		await batch.commit();

		return {
			day,
			created: true,
			templateKey: draft.templateKey,
			difficulty: draft.difficulty,
			tries: attempt,
		};
	}

	return {
		day,
		created: false,
		templateKey: null,
		difficulty: null,
		tries: MAX_TRIES,
	};
}
