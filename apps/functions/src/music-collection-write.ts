/**
 * A collection-definíciók írása. A `firestore.rules` a kliensnek tiltja a
 * `music-collection/{uid}` írását, ezért minden változás itt megy át: a
 * jogosultságot az index.ts ellenőrzi, a szabályt a
 * music-collection-definition.ts validálja, és itt marad a Firestore —
 * egyediség, szülőlánc, és a kliens-cache szinkronja.
 */

import {
	DocumentSnapshot,
	Firestore,
	Transaction,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import { stamp, tombstone, touchCatalog } from './catalog-sync';
import {
	DefinitionError,
	MusicCollectionDefinition,
	criteriaFingerprint,
	prepareDefinition,
} from './music-collection-definition';

const MUSIC_COLLECTION_COLLECTION = 'music-collection';
const FEATURE_KEYS = [MUSIC_COLLECTION_COLLECTION];
/** `libs/common/api` EntityTypeEnum.MusicCollection. */
const ENTITY_TYPE = 'Music Collection';
/** A szülőlánc bejárásának korlátja, hogy a régi kör se akassza meg. */
const MAX_PARENT_DEPTH = 32;

/** A validálás hibája a hívónak szóló hiba, nem üzemzavar. */
function prepare(data: unknown): MusicCollectionDefinition {
	try {
		return prepareDefinition(data);
	} catch (error) {
		if (error instanceof DefinitionError) {
			throw new HttpsError(error.code, error.message);
		}

		throw error;
	}
}

function requireUid(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzó uid.');
	}

	return value.trim();
}

function definitions(database: Firestore) {
	return database.collection(MUSIC_COLLECTION_COLLECTION);
}

/** A slug az útvonal része, ezért csak egy collectioné lehet. */
async function requireFreeSlug(
	database: Firestore,
	transaction: Transaction,
	slug: string,
	uid: string
): Promise<void> {
	const taken = await transaction.get(
		definitions(database).where('slug', '==', slug).limit(2)
	);

	if (taken.docs.some((document) => document.id !== uid)) {
		throw new HttpsError(
			'already-exists',
			`Ezt a slugot már használja egy collection: ${slug}.`
		);
	}
}

/**
 * A szülő létezik, és nem önmagán át vezet vissza: a kör a fát bejáró
 * oldalakat akasztaná meg.
 */
async function requireParent(
	database: Firestore,
	transaction: Transaction,
	parentUid: string | null,
	uid: string
): Promise<void> {
	if (!parentUid) {
		return;
	}
	if (parentUid === uid) {
		throw new HttpsError(
			'failed-precondition',
			'A collection nem lehet a saját szülője.'
		);
	}

	let currentUid: string | null = parentUid;

	for (let depth = 0; currentUid && depth < MAX_PARENT_DEPTH; depth += 1) {
		const parent: DocumentSnapshot = await transaction.get(
			definitions(database).doc(currentUid)
		);

		if (!parent.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen szülő collection.');
		}

		currentUid = (parent.get('parentUid') as string | null) ?? null;

		if (currentUid === uid) {
			throw new HttpsError(
				'failed-precondition',
				'A szülő a collection leszármazottja.'
			);
		}
	}
}

export async function createMusicCollection(
	database: Firestore,
	data: unknown
): Promise<{ uid: string }> {
	const definition = prepare(data);
	const reference = definitions(database).doc();

	await database.runTransaction(async (transaction) => {
		await requireFreeSlug(
			database,
			transaction,
			definition.slug,
			reference.id
		);
		await requireParent(
			database,
			transaction,
			definition.parentUid,
			reference.id
		);

		transaction.set(
			reference,
			stamp({
				...definition,
				uid: reference.id,
				entityType: ENTITY_TYPE,
				createdAt: Date.now(),
				criteriaVersion: 1,
			})
		);
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	return { uid: reference.id };
}

/**
 * A definíció új tartalma. A dokumentumot lecseréljük, nem foltozzuk: így a
 * validált mezőkön kívül más nem maradhat benne.
 *
 * A `criteriaVersion` csak a szabály változásakor nő — a feloldott tagság ezt
 * hordozza, és a névjavítás nem avulhat el tőle.
 */
export async function updateMusicCollection(
	database: Firestore,
	uid: unknown,
	data: unknown
): Promise<{ uid: string; criteriaVersion: number }> {
	const definition = prepare(data);
	const reference = definitions(database).doc(requireUid(uid));
	let criteriaVersion = 1;

	await database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);

		if (!snapshot.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen collection.');
		}

		await requireFreeSlug(
			database,
			transaction,
			definition.slug,
			reference.id
		);
		await requireParent(
			database,
			transaction,
			definition.parentUid,
			reference.id
		);

		const previousVersion = Number(snapshot.get('criteriaVersion')) || 1;
		const changed =
			criteriaFingerprint(snapshot.get('criteria') ?? {}) !==
			criteriaFingerprint(definition.criteria);

		criteriaVersion = changed ? previousVersion + 1 : previousVersion;

		transaction.set(
			reference,
			stamp({
				...definition,
				uid: reference.id,
				entityType: ENTITY_TYPE,
				createdAt: Number(snapshot.get('createdAt')) || Date.now(),
				criteriaVersion,
			})
		);
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	return { uid: reference.id, criteriaVersion };
}

/**
 * Törlés markerrel: enélkül a kliensek cache-ében ott maradna. A gyerekeit
 * előbb el kell rendezni, különben árván maradnának a fában.
 */
export async function deleteMusicCollection(
	database: Firestore,
	uid: unknown
): Promise<{ uid: string }> {
	const reference = definitions(database).doc(requireUid(uid));

	await database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);

		if (!snapshot.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen collection.');
		}

		const children = await transaction.get(
			definitions(database)
				.where('parentUid', '==', reference.id)
				.limit(1)
		);

		if (!children.empty) {
			throw new HttpsError(
				'failed-precondition',
				'Előbb a gyerek collectionöket kell áthelyezni vagy törölni.'
			);
		}

		const marker = tombstone(database, reference);

		transaction.delete(reference);
		transaction.set(marker.reference, marker.data);
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	return { uid: reference.id };
}
