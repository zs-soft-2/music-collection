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

import { stamp, tombstone, touchCatalog } from './catalog-sync';

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

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';
const RELEASE_COLLECTION = 'release';
const CONTRIBUTION_COLLECTION = 'contribution';
const MEMBERSHIP_COLLECTION = 'membership';
const RATING_COLLECTION = 'rating';
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

/**
 * Egy tranzakció legfeljebb 500 írást visz; a markerrel törölt dokumentum
 * kettőt. Ami ezen túl van, azt nem félig törüljük, hanem elutasítjuk.
 */
const MAX_TRANSACTION_WRITES = 480;

/** Egy `in` szűrő legfeljebb 30 értéket kérdezhet egyszerre. */
const IN_QUERY_LIMIT = 30;

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

export interface AlbumDeletionResult {
	uid: string;
	/** Hány kiadás (préselés) ment az albummal. */
	deletedReleases: number;
	/** Hány szám ment vele — az albuméi és a préseléseké együtt. */
	deletedTracks: number;
	/** Hány példány ment vele a hívó saját gyűjteményéből. */
	deletedCopies: number;
	/** Hány saját értékelés ment vele. */
	deletedRatings: number;
}

/** A gyűjtő, akinek a `user/{uid}/…` alatti dokumentuma ez. */
function ownerOf(reference: DocumentReference): string | null {
	const [root, uid] = reference.path.split('/');

	return root === 'user' ? (uid ?? null) : null;
}

function chunked<T>(values: T[]): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < values.length; index += IN_QUERY_LIMIT) {
		chunks.push(values.slice(index, index + IN_QUERY_LIMIT));
	}

	return chunks;
}

/**
 * Egy album törlése mindennel, ami alatta van.
 *
 * A kiadásnál szigorúbb a kép, mert az album a hívó saját tévedését is
 * hordozhatja: a rossz előadó alá felvett lemezből jellemzően épp a hívónak
 * van példánya. Ezért a példány itt nem blokkol eleve, csak az IDEGEN —
 * a hívó sajátjai az albummal mennek (a kliens előbb megkérdezi, és kimondja
 * a számukat). Ugyanígy az értékelés: a sajátja megy, másé megállít.
 *
 * Vele megy: a préselései (bárhol a fában), az albumhoz és a préselésekhez
 * tartozó számok, a közreműködések, a préselések sorszám-foglalásai, és a
 * tagságok `albumUids`-jából kikerül. A közösségi átlagot
 * (`album-rating`) a `syncAlbumRating` trigger veszi le az utolsó értékelés
 * törlésekor.
 *
 * Az album két helyen élhet (`artist/{uid}/album` és a gyökér `album`); a
 * kliens megmondja az előadót, a gyökeret pedig mindig megnézzük.
 */
export async function deleteAlbum(
	database: Firestore,
	uid: unknown,
	artistUid: unknown,
	callerUid: string
): Promise<AlbumDeletionResult> {
	const id = requireUid(uid);
	const artist =
		typeof artistUid === 'string' && artistUid.trim()
			? artistUid.trim()
			: null;

	return database.runTransaction(async (transaction) => {
		const candidates = [
			...(artist
				? [
						database
							.collection(ARTIST_COLLECTION)
							.doc(artist)
							.collection(ALBUM_COLLECTION)
							.doc(id),
					]
				: []),
			database.collection(ALBUM_COLLECTION).doc(id),
		];
		const albums = (
			await Promise.all(
				candidates.map((candidate) => transaction.get(candidate))
			)
		).filter((snapshot) => snapshot.exists);

		if (!albums.length) {
			throw new DeletionError('Nincs ilyen album.', 'not-found');
		}

		const releases = await transaction.get(
			database
				.collectionGroup(RELEASE_COLLECTION)
				.where('album.uid', '==', id)
				.limit(MAX_CASCADE + 1)
		);

		if (releases.size > MAX_CASCADE) {
			throw new DeletionError(
				'Túl sok kiadás tartozik az albumhoz, kézi rendezés kell.'
			);
		}

		const releaseUids = [
			...new Set(
				releases.docs.map(
					(document) =>
						(document.get('uid') as string | undefined) ??
						document.ref.id
				)
			),
		];
		const releaseChunks = chunked(releaseUids);
		const byReleases = async (collection: string, field: string) =>
			(
				await Promise.all(
					releaseChunks.map((chunk) =>
						transaction.get(
							collection === COLLECTION_ITEM_COLLECTION
								? database
										.collectionGroup(collection)
										.where(field, 'in', chunk)
										.limit(MAX_CASCADE + 1)
								: database
										.collection(collection)
										.where(field, 'in', chunk)
										.limit(MAX_CASCADE + 1)
						)
					)
				)
			).flatMap((snapshot) => snapshot.docs);

		const [copies, releaseTracks, serials] = await Promise.all([
			byReleases(COLLECTION_ITEM_COLLECTION, 'release.uid'),
			byReleases(TRACK_COLLECTION, 'releaseUid'),
			byReleases(COPY_SERIAL_COLLECTION, 'releaseId'),
		]);

		const foreignCopies = copies.filter(
			(document) => ownerOf(document.ref) !== callerUid
		);

		if (foreignCopies.length) {
			throw new DeletionError(
				`Az albumból ${foreignCopies.length} példány más gyűjtő ` +
					'gyűjteményében van, ezért nem törölhető.'
			);
		}

		const [albumTracks, contributions, memberships, ratings] =
			await Promise.all([
				transaction.get(
					database
						.collection(TRACK_COLLECTION)
						.where('albumUid', '==', id)
						.limit(MAX_CASCADE + 1)
				),
				transaction.get(
					database
						.collection(CONTRIBUTION_COLLECTION)
						.where('albumUid', '==', id)
						.limit(MAX_CASCADE + 1)
				),
				transaction.get(
					database
						.collection(MEMBERSHIP_COLLECTION)
						.where('albumUids', 'array-contains', id)
						.limit(MAX_CASCADE + 1)
				),
				transaction.get(
					database
						.collectionGroup(RATING_COLLECTION)
						.where('albumId', '==', id)
						.limit(MAX_CASCADE + 1)
				),
			]);

		if (
			ratings.docs.some(
				(document) => ownerOf(document.ref) !== callerUid
			)
		) {
			throw new DeletionError(
				'Az albumot más gyűjtő is értékelte, ezért nem törölhető.'
			);
		}

		// Egy préselés száma az album uid-jét is hordozhatja: egyszer
		// törlődik, akárhonnan jött.
		const tracks = new Map(
			[...albumTracks.docs, ...releaseTracks].map((document) => [
				document.ref.path,
				document,
			])
		);
		const withMarker =
			albums.length +
			releases.size +
			tracks.size +
			contributions.size +
			copies.length +
			ratings.size;
		const writeCount =
			2 * withMarker + serials.length + memberships.size + 3;

		if (writeCount > MAX_TRANSACTION_WRITES) {
			throw new DeletionError(
				'Túl sok dokumentum tartozik az albumhoz, kézi rendezés kell.'
			);
		}

		const albumArtistUid =
			(albums[0].get('artist.uid') as string | null) ?? artist;

		albums.forEach((snapshot) =>
			remove(database, transaction, snapshot.ref)
		);
		releases.docs.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		tracks.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		contributions.docs.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		copies.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		ratings.docs.forEach((document) =>
			remove(database, transaction, document.ref)
		);
		serials.forEach((document) => transaction.delete(document.ref));

		memberships.docs.forEach((document) => {
			const albumUids = (document.get('albumUids') as string[]) ?? [];

			transaction.update(
				document.ref,
				stamp({
					albumUids: FieldValue.arrayRemove(id),
					// A lista hosszával együtt léptetjük; a kézzel
					// javított számhoz nem nyúlunk.
					...(document.get('albumCount') === albumUids.length
						? { albumCount: albumUids.length - 1 }
						: {}),
				})
			);
		});

		decreaseAlbumQuantity(database, transaction, albumArtistUid);

		if (releases.size) {
			decreaseReleaseQuantities(
				database,
				transaction,
				releases.docs.map(
					(document) =>
						(document.get('artist.uid') as string | null) ?? null
				),
				id
			);
		}

		touchCatalog(database, transaction, [
			ALBUM_COLLECTION,
			RELEASE_COLLECTION,
			TRACK_COLLECTION,
			CONTRIBUTION_COLLECTION,
			MEMBERSHIP_COLLECTION,
			COLLECTION_ITEM_COLLECTION,
			RATING_COLLECTION,
			ENTITY_QUANTITY_COLLECTION,
		]);

		return {
			uid: id,
			deletedReleases: releases.size,
			deletedTracks: tracks.size,
			deletedCopies: copies.length,
			deletedRatings: ratings.size,
		};
	});
}

/** Az album darabszáma, előadónként bontva, mint az `AlbumUtilService`-ben. */
function decreaseAlbumQuantity(
	database: Firestore,
	transaction: Transaction,
	artistUid: string | null
): void {
	transaction.set(
		database.collection(ENTITY_QUANTITY_COLLECTION).doc(ALBUM_ENTITY_TYPE),
		{
			type: ALBUM_ENTITY_TYPE,
			quantity: FieldValue.increment(-1),
			modifyDate: new Date(),
			...(artistUid
				? {
						group: {
							[ARTIST_ENTITY_TYPE]: {
								[artistUid]: FieldValue.increment(-1),
							},
						},
					}
				: {}),
		},
		{ merge: true }
	);
}

/**
 * Az album összes préselésének darabszáma egy írásban: egy dokumentumra
 * egy tranzakción belül nem írunk kétszer.
 */
function decreaseReleaseQuantities(
	database: Firestore,
	transaction: Transaction,
	artistUids: (string | null)[],
	albumUid: string
): void {
	const byArtist = new Map<string, number>();

	artistUids.forEach((artistUid) => {
		if (artistUid) {
			byArtist.set(artistUid, (byArtist.get(artistUid) ?? 0) + 1);
		}
	});

	transaction.set(
		database
			.collection(ENTITY_QUANTITY_COLLECTION)
			.doc(RELEASE_ENTITY_TYPE),
		{
			type: RELEASE_ENTITY_TYPE,
			quantity: FieldValue.increment(-artistUids.length),
			modifyDate: new Date(),
			group: {
				[ALBUM_ENTITY_TYPE]: {
					[albumUid]: FieldValue.increment(-artistUids.length),
				},
				...(byArtist.size
					? {
							[ARTIST_ENTITY_TYPE]: Object.fromEntries(
								[...byArtist].map(([artistUid, count]) => [
									artistUid,
									FieldValue.increment(-count),
								])
							),
						}
					: {}),
			},
		},
		{ merge: true }
	);
}
