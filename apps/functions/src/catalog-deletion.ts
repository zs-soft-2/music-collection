/**
 * Katalógus-entitás törlése. A kliens előbb megkérdezi, mi tartja életben az
 * entitást (hogy a párbeszéd meg tudja mondani), de a döntés itt születik: a
 * `firestore.rules` a kiadás törlését tiltja a kliensnek, és a feltételeket
 * ez a modul nézi meg újra, tranzakcióban.
 *
 * Miért nem elég a kliens: egy másik gyűjtő példánya nincs a kliens
 * cache-ében, a kérdés és a kattintás között pedig bármikor felvehet valaki
 * egy példányt. Az a példány itt bukik ki, nem ott.
 *
 * Amit a törlés visz: a kiadás saját számai (`track.releaseUid`) és az
 * elárvult sorszám-foglalások. Amit nem: bárki példánya — az a kiadást
 * életben tartja, és ilyenkor a kliens az archiválást ajánlja fel helyette.
 *
 * A hibát `DeletionError` jelzi, nem `HttpsError`: a `firebase-functions`
 * modult a jest nem tudja betölteni, a hívó (index.ts) pedig egy sorban
 * fordítja át — ugyanaz a felállás, mint a music-collection-definition.ts-nél.
 */

import {
	DocumentReference,
	FieldValue,
	Firestore,
	Transaction,
} from 'firebase-admin/firestore';

import { tombstone, touchCatalog } from './catalog-sync';

/** A törlés elutasítása: a hívónak szóló hiba, nem üzemzavar. */
export class DeletionError extends Error {
	public constructor(
		message: string,
		public readonly code:
			| 'invalid-argument'
			| 'not-found'
			| 'failed-precondition' = 'failed-precondition'
	) {
		super(message);
		this.name = 'DeletionError';
	}
}

const RELEASE_COLLECTION = 'release';
const TRACK_COLLECTION = 'track';
const COLLECTION_ITEM_COLLECTION = 'collection-item';
const COPY_SERIAL_COLLECTION = 'copy-serial';
const ENTITY_QUANTITY_COLLECTION = 'entity-quantity';
/** `libs/common/api` EntityTypeEnum.Release / .Album / .Artist. */
const RELEASE_ENTITY_TYPE = 'Release';
const ALBUM_ENTITY_TYPE = 'Album';
const ARTIST_ENTITY_TYPE = 'Artist';

/**
 * A kaszkádolva törölhető dokumentumok felső korlátja. Egy préselésnek
 * legfeljebb néhány tucat száma van; ennél több azt jelenti, hogy valami
 * mást találtunk el — és a tranzakció 500 írásába sem férnénk bele.
 */
const MAX_CASCADE = 200;

export interface ReleaseDeletionResult {
	uid: string;
	/** Hány szám ment a kiadással. */
	deletedTracks: number;
	/** Hány elárvult sorszám-foglalás szabadult fel. */
	releasedSerials: number;
}

function requireUid(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new DeletionError('Hiányzó uid.', 'invalid-argument');
	}

	return value.trim();
}

/**
 * Törlés markerrel: enélkül a kliensek cache-ében ott maradna a dokumentum.
 */
function remove(
	database: Firestore,
	transaction: Transaction,
	reference: DocumentReference
): void {
	const marker = tombstone(database, reference);

	transaction.delete(reference);
	transaction.set(marker.reference, marker.data);
}

/**
 * Az admin darabszám, amit egyébként a kliens léptet. A `group` a kiadásokat
 * albumonként és előadónként is számolja — ugyanaz a bontás, amit a
 * `ReleaseUtilService.updateEntityQuantity` ír felvételkor.
 */
function decreaseReleaseQuantity(
	database: Firestore,
	transaction: Transaction,
	albumUid: string | null,
	artistUid: string | null
): void {
	const group: Record<string, Record<string, FieldValue>> = {};

	if (albumUid) {
		group[ALBUM_ENTITY_TYPE] = { [albumUid]: FieldValue.increment(-1) };
	}

	if (artistUid) {
		group[ARTIST_ENTITY_TYPE] = { [artistUid]: FieldValue.increment(-1) };
	}

	transaction.set(
		database
			.collection(ENTITY_QUANTITY_COLLECTION)
			.doc(RELEASE_ENTITY_TYPE),
		{
			type: RELEASE_ENTITY_TYPE,
			quantity: FieldValue.increment(-1),
			modifyDate: new Date(),
			...(Object.keys(group).length ? { group } : {}),
		},
		{ merge: true }
	);
}

/**
 * Egy kiadás törlése mindennel, ami alatta van.
 *
 * A dokumentumot `uid` szerint keressük az egész fában: a kiadások két
 * helyen élnek (a gyökérben és az `artist/{uid}/album/{uid}/release` alatt),
 * és hogy melyikben, az attól függ, mi írta.
 */
export async function deleteRelease(
	database: Firestore,
	uid: unknown
): Promise<ReleaseDeletionResult> {
	const id = requireUid(uid);

	return database.runTransaction(async (transaction) => {
		// Előbb minden olvasás: tranzakcióban az írás után már nem lehet.
		const releases = await transaction.get(
			database
				.collectionGroup(RELEASE_COLLECTION)
				.where('uid', '==', id)
				.limit(2)
		);

		if (releases.empty) {
			throw new DeletionError('Nincs ilyen kiadás.', 'not-found');
		}

		const copies = await transaction.get(
			database
				.collectionGroup(COLLECTION_ITEM_COLLECTION)
				.where('release.uid', '==', id)
				.limit(1)
		);

		if (!copies.empty) {
			throw new DeletionError(
				'A kiadásból van példány valakinek a gyűjteményében, ' +
					'ezért nem törölhető. Archiváld helyette.'
			);
		}

		const [tracks, serials] = await Promise.all([
			transaction.get(
				database
					.collection(TRACK_COLLECTION)
					.where('releaseUid', '==', id)
					.limit(MAX_CASCADE + 1)
			),
			transaction.get(
				database
					.collection(COPY_SERIAL_COLLECTION)
					.where('releaseId', '==', id)
					.limit(MAX_CASCADE + 1)
			),
		]);

		if (tracks.size > MAX_CASCADE || serials.size > MAX_CASCADE) {
			throw new DeletionError(
				'Túl sok dokumentum tartozik a kiadáshoz, ' +
					'kézi rendezés kell.'
			);
		}

		const release = releases.docs[0];
		const albumUid = (release.get('album.uid') as string | null) ?? null;
		const artistUid = (release.get('artist.uid') as string | null) ?? null;

		releases.docs.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		tracks.docs.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		// A foglalás nem katalógus-adat, a kliens nem listázza: marker
		// nélkül törlődik, ahogy a példány elengedésekor is.
		serials.docs.forEach((document) => transaction.delete(document.ref));

		decreaseReleaseQuantity(database, transaction, albumUid, artistUid);
		touchCatalog(database, transaction, [
			RELEASE_COLLECTION,
			TRACK_COLLECTION,
			ENTITY_QUANTITY_COLLECTION,
		]);

		return {
			uid: id,
			deletedTracks: tracks.size,
			releasedSerials: serials.size,
		};
	});
}
