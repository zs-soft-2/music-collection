/**
 * A lemez közösségi átlaga: egy dokumentum albumonként, amit minden
 * értékelés-írás után újraszámolunk.
 *
 * Miért trigger, és miért nem ütemezett futás: egy csillag megadása egy
 * esemény, ami EGY albumot érint. Egy napi futás ezzel szemben minden gyűjtő
 * minden értékelését végigolvasná, hogy legtöbbször ugyanazt írja ki — a
 * ranglistánál (`daily-question-leaderboard`) azért más a válasz, mert ott a
 * helyezés az egész mezőnytől függ, itt viszont minden album a maga dolga.
 *
 * Miért újraszámolás, és miért nem `FieldValue.increment`: a trigger
 * legalább-egyszer fut le, tehát ugyanazt az írást két futás is láthatja. Egy
 * növelés ilyenkor kétszer számolna; az újraszámolás ugyanazt az eredményt
 * adja ahányszor csak lefut. Az ára egy collection-group olvasás az adott
 * album értékeléseire — annyi olvasás, ahányan értékelték.
 *
 * Az értékelések a gyűjtők saját adatai (`user/{uid}/rating/{albumId}`), amit
 * a szabályok senki más elől nem engednek el. Ez a futás az Admin SDK-val
 * olvassa őket, és CSAK összeget ír ki: darabszámot, átlagot, megoszlást —
 * azt, hogy ki mit adott, nem.
 */

import { Firestore } from 'firebase-admin/firestore';

/** A gyűjtők értékelései; collection-group lekérdezés megy rá. */
export const RATING_COLLECTION = 'rating';
/** A közösségi átlagok, albumonként egy dokumentum. */
export const ALBUM_RATING_COLLECTION = 'album-rating';

/**
 * Ennyi értékelést olvasunk el egy albumra. A valóság ennek a töredéke; a
 * korlát azért van, hogy egy népszerű lemez se tegyen egy triggert
 * megfizethetetlenné.
 */
export const MAX_RATINGS_PER_ALBUM = 2000;

export interface AlbumRatingSummary {
	albumId: string;
	count: number;
	/** Egy tizedesre kerekítve. */
	average: number;
	/** Hányan adtak egy csillagot, kettőt, és így tovább ötig. */
	histogram: number[];
	updatedAt: number;
}

/** A csillagok, amiket a szabály is elfogad; bármi más nem értékelés. */
function isStar(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= 5
	);
}

/**
 * Az összeg a beolvasott értékelésekből. A skálán kívüli csillagot kihagyja:
 * a szabály nem engedne be ilyet, de egy átlag, ami egy hibás dokumentumtól
 * elcsúszik, csendben hazudik — márpedig ez a szám minden látogatónak szól.
 */
export function summariseAlbumRating(
	albumId: string,
	stars: readonly unknown[],
	now = Date.now()
): AlbumRatingSummary {
	const histogram = [0, 0, 0, 0, 0];
	let total = 0;
	let count = 0;

	for (const value of stars) {
		if (isStar(value)) {
			histogram[value - 1] += 1;
			total += value;
			count += 1;
		}
	}

	return {
		albumId,
		count,
		average: count ? Math.round((total / count) * 10) / 10 : 0,
		histogram,
		updatedAt: now,
	};
}

export interface SyncAlbumRatingResult {
	/** Ennyi értékelést olvasott el a futás. */
	read: number;
	/** Az új darabszám; 0 esetén a dokumentum törlődött. */
	count: number;
}

/**
 * Újraszámolja egy album közösségi átlagát, és kiírja — vagy leszedi, ha az
 * utolsó értékelést is visszavonták. Egy lemez, amiről senki nem mondott
 * semmit, ne álljon nulla átlaggal a lapján.
 */
export async function syncAlbumRating(
	database: Firestore,
	albumId: string,
	now = Date.now()
): Promise<SyncAlbumRatingResult> {
	const snapshot = await database
		.collectionGroup(RATING_COLLECTION)
		.where('albumId', '==', albumId)
		.limit(MAX_RATINGS_PER_ALBUM)
		.get();

	const summary = summariseAlbumRating(
		albumId,
		snapshot.docs.map((document) => document.get('stars')),
		now
	);
	const reference = database.collection(ALBUM_RATING_COLLECTION).doc(albumId);

	if (summary.count === 0) {
		await reference.delete();
	} else {
		await reference.set(summary);
	}

	return { read: snapshot.size, count: summary.count };
}
