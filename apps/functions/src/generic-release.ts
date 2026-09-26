/**
 * Általános kiadás: nem egy préselés, hanem maga az album egy hordozón. A
 * gyűjtő annyit tud, hogy bakelitje (CD-je, DVD-je, kazettája) van belőle —
 * kiadót, országot, katalógusszámot nem. Albumonként és hordozónként egy
 * ilyen kiadás van a katalógusban, fix azonosítóval; minden ilyen példány
 * erre mutat, így nem lesz annyi másolat, ahány gyűjtő.
 *
 * A gyűjtő katalógus-kiadást nem írhat (firestore.rules), ezért hozza létre
 * ez a függvény. Magát a példányt a kliens írja, a szokott úton.
 */

import { Firestore } from 'firebase-admin/firestore';

import {
	searchParameters,
	stamp,
	touchCatalog,
	withoutUpdatedAt,
} from './catalog-sync';
import { CatalogAlbum } from './discogs-release';

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';
const RELEASE_COLLECTION = 'release';

/** A hordozók, amelyeken általános kiadás lehet (libs/api GENERIC_RELEASE_MEDIA). */
export const GENERIC_RELEASE_MEDIA = [
	'vinyl',
	'cd',
	'dvd',
	'cassette',
] as const;

export type GenericReleaseMedia = (typeof GENERIC_RELEASE_MEDIA)[number];

export interface EnsureGenericReleaseInput {
	artistUid: string;
	albumUid: string;
	media: GenericReleaseMedia;
}

export interface EnsureGenericReleaseResult {
	release: Record<string, unknown>;
	created: boolean;
}

export function isGenericReleaseMedia(
	value: unknown
): value is GenericReleaseMedia {
	return GENERIC_RELEASE_MEDIA.includes(value as GenericReleaseMedia);
}

/**
 * Az azonosító (libs/api `genericReleaseUid`). Az album azonosítója benne
 * van, mert a kiadásokat collection groupként olvassuk: ott az azonosítónak
 * magában is egyedinek kell lennie.
 */
export function genericReleaseUid(
	albumUid: string,
	media: GenericReleaseMedia
): string {
	return `generic-${albumUid}-${media}`;
}

function isTimestamp(value: unknown): value is { toMillis: () => number } {
	return (
		!!value &&
		typeof (value as { toMillis?: unknown }).toMillis === 'function'
	);
}

/** Az album éve epoch ms-ben — számként és Timestampként is tárolt. */
export function albumYearMillis(year: unknown): number | null {
	if (typeof year === 'number' && Number.isFinite(year)) {
		return year;
	}
	if (year instanceof Date) {
		return year.getTime();
	}
	if (isTimestamp(year)) {
		return year.toMillis();
	}

	return null;
}

/**
 * A válaszban a Timestampek epoch ms-ként mennek. A callable a Timestampet
 * `{ _seconds, _nanoseconds }` objektumként küldené, azt pedig a kliens —
 * amely a kiadást a példányba ágyazza — nem ismerné fel dátumként.
 */
export function withPlainDates(value: unknown): unknown {
	if (value instanceof Date) {
		return value.getTime();
	}
	if (isTimestamp(value)) {
		return value.toMillis();
	}
	if (Array.isArray(value)) {
		return value.map(withPlainDates);
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				withPlainDates(item),
			])
		);
	}

	return value;
}

/**
 * A katalógus-dokumentum. A dátum az album éve: az általános kiadás az
 * eredeti album, nem egy későbbi préselés.
 */
export function toGenericRelease(
	album: CatalogAlbum,
	media: GenericReleaseMedia
): Record<string, unknown> {
	return {
		uid: genericReleaseUid(album.uid, media),
		entityType: 'Release',
		generic: true,
		name: album.name,
		album,
		artist: {
			uid: album.artist?.uid ?? null,
			entityType: 'Artist',
			name: album.artist?.name ?? null,
		},
		catno: null,
		country: null,
		date: albumYearMillis(album['year']),
		formatDescription: null,
		label: null,
		media,
		discogsReleaseId: null,
		searchParameters: searchParameters(album.name),
	};
}

/**
 * Az album általános kiadása a hordozón: a meglévő, vagy most létrehozva;
 * `null`, ha nincs ilyen album. Tranzakcióban, mert két gyűjtő egyszerre is
 * felveheti ugyanazt.
 */
export async function ensureGenericRelease(
	database: Firestore,
	{ artistUid, albumUid, media }: EnsureGenericReleaseInput
): Promise<EnsureGenericReleaseResult | null> {
	const albumReference = database.doc(
		`${ARTIST_COLLECTION}/${artistUid}/${ALBUM_COLLECTION}/${albumUid}`
	);
	const releaseReference = albumReference
		.collection(RELEASE_COLLECTION)
		.doc(genericReleaseUid(albumUid, media));

	return database.runTransaction(async (transaction) => {
		const existing = await transaction.get(releaseReference);

		if (existing.exists) {
			return {
				release: withPlainDates(
					withoutUpdatedAt(existing.data() as Record<string, unknown>)
				) as Record<string, unknown>,
				created: false,
			};
		}

		const albumSnapshot = await transaction.get(albumReference);

		if (!albumSnapshot.exists) {
			return null;
		}

		const album = withoutUpdatedAt({
			...(albumSnapshot.data() as Record<string, unknown>),
			uid: albumSnapshot.id,
		}) as CatalogAlbum;
		const release = toGenericRelease(album, media);

		transaction.set(releaseReference, stamp(release));
		touchCatalog(database, transaction, [RELEASE_COLLECTION]);

		return {
			release: withPlainDates(release) as Record<string, unknown>,
			created: true,
		};
	});
}
