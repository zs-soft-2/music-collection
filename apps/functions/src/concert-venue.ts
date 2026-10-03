/**
 * Koncerthelyszínek: egy ország helyei a MusicBrainzről.
 *
 * Ez a feature egyetlen pontja, ahol a MusicBrainz adata gazdag. A `place`
 * entitásból Magyarországra 249 hely jön, közülük száz koordinátával és
 * címmel — ennyit kézzel senki nem gépelne be. Az `event` entitással szemben,
 * amiben az egész országra két esemény van, ez használható törzsadat.
 *
 * A böngészés (`?area=`) hierarchikus: az ország area-azonosítójára a megyék
 * és városok helyei is megjönnek, három lapban. Az országot ISO-kódból
 * oldjuk fel (`iso1:HU`), nem beégetve: a világra nyitás így egy paraméter.
 *
 * Nem minden hely koncerthelyszín. A 249-ből 81 hangstúdió, van présüzem és
 * iskola is; a `CONCERT_PLACE_TYPES` szűri ki, hol lehet fellépés. Amit a
 * MusicBrainz nem tipizált, az kimarad — ha mégis játszanak ott, a
 * koncertbetöltés hozza majd létre a helyszínt magától.
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';

import { stamp } from './catalog-sync';
import { MusicBrainzRequestOptions, musicBrainzGet } from './musicbrainz-api';

export const VENUE_COLLECTION = 'venue';
/** `libs/common/api` EntityTypeEnum.Venue. */
const ENTITY_TYPE = 'Venue';
/** A `place` böngészés lapmérete; a MusicBrainz ennél nagyobbat nem ad. */
const PAGE_SIZE = 100;
/** Egy Firestore batch 500 művelet; a szinkron-bump is elfér mellette. */
const BATCH_LIMIT = 400;
/**
 * Ahol koncert lehet. A MusicBrainz `place` típusai közül ennyi az, ahol
 * fellépés zajlik — a stúdió, a présüzem és az iskola nem ilyen.
 *
 * A típus nélküli helyek (`null`) kimaradnak: huszonhárom ilyen van, és nem
 * tudni, melyik közülük koncerthelyszín. Amelyikben tényleg játszanak, azt a
 * koncertbetöltés veszi fel, mert az már tudja, hogy ott volt fellépés.
 */
export const CONCERT_PLACE_TYPES = [
	'Venue',
	'Stadium',
	'Indoor arena',
	'Amphitheatre',
	'Concert hall / Theatre',
	'Club',
	'Festival stage',
	'Park',
];

/** Amit a MusicBrainz egy helyről ad. */
export interface MusicBrainzPlace {
	id: string;
	name?: string;
	type?: string | null;
	address?: string | null;
	disambiguation?: string | null;
	coordinates?: { latitude?: string; longitude?: string } | null;
	area?: { id?: string; name?: string } | null;
	'life-span'?: { begin?: string | null; end?: string | null } | null;
}

interface MusicBrainzPlaceBrowse {
	'place-count'?: number;
	places?: MusicBrainzPlace[];
}

interface MusicBrainzAreaSearch {
	areas?: { id: string; name?: string }[];
}

/** Egy helyszín úgy, ahogy a Firestore-ba kerül. */
export interface VenueDocument {
	active: boolean;
	address: string | null;
	city: string | null;
	closedAt: string | null;
	coordinates: { latitude: number; longitude: number } | null;
	countryCode: string;
	entityType: string;
	musicBrainzId: string | null;
	name: string;
	searchParameters: string[];
	source: 'musicbrainz' | 'ai' | 'manual';
	type: string | null;
	uid: string;
}

export interface VenueSyncResult {
	scanned: number;
	venues: number;
	written: number;
	unchanged: number;
}

/**
 * Az ország area-azonosítója az ISO-kódjából. A keresés indexelt mezője
 * `iso1` — a dokumentációbeli `iso-3166-1` nem az, és csendben találomra
 * válaszol helyette.
 */
export async function resolveCountryArea(
	countryCode: string,
	request?: MusicBrainzRequestOptions
): Promise<string> {
	const search = await musicBrainzGet<MusicBrainzAreaSearch>(
		'/area',
		{ query: `iso1:${countryCode.toUpperCase()}` },
		request
	);
	const area = search.areas?.[0]?.id;

	if (!area) {
		throw new Error(
			`A MusicBrainz nem ismer országot ${countryCode} ISO-kóddal.`
		);
	}

	return area;
}

/** Az ország összes helye, lapozva végig. */
export async function fetchPlaces(
	areaId: string,
	request?: MusicBrainzRequestOptions
): Promise<MusicBrainzPlace[]> {
	const places: MusicBrainzPlace[] = [];
	let offset = 0;
	let total = Number.POSITIVE_INFINITY;

	while (offset < total) {
		const page = await musicBrainzGet<MusicBrainzPlaceBrowse>(
			'/place',
			{ area: areaId, limit: PAGE_SIZE, offset },
			request
		);

		total = page['place-count'] ?? places.length;
		places.push(...(page.places ?? []));

		if (!page.places?.length) break;

		offset += PAGE_SIZE;
	}

	return places;
}

/** Koncerthelyszín-e a hely: a típusa alapján. */
export function isConcertPlace(place: MusicBrainzPlace): boolean {
	return !!place.type && CONCERT_PLACE_TYPES.includes(place.type);
}

/** Kereső előtagok helyett szavak: a helyszínkereső a szó elejére illeszt. */
export function venueSearchParameters(
	name: string,
	city: string | null
): string[] {
	const words = `${name} ${city ?? ''}`
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 1);

	return [...new Set(words)];
}

/** Egy MusicBrainz hely a mi dokumentumunkként. */
export function toVenueDocument(
	place: MusicBrainzPlace,
	countryCode: string
): VenueDocument {
	const name = (place.name ?? '').trim();
	// Az area a hely települése — az országra böngészve is a város jön vissza.
	// Ahol maga az ország az area, ott nincs település, és ezt nem pótoljuk.
	const city =
		place.area?.name && place.area.name !== countryName(countryCode)
			? place.area.name
			: null;
	const latitude = Number(place.coordinates?.latitude);
	const longitude = Number(place.coordinates?.longitude);
	const closedAt = place['life-span']?.end ?? null;

	return {
		active: !closedAt,
		address: place.address?.trim() || null,
		city,
		closedAt,
		coordinates:
			Number.isFinite(latitude) && Number.isFinite(longitude)
				? { latitude, longitude }
				: null,
		countryCode: countryCode.toUpperCase(),
		entityType: ENTITY_TYPE,
		musicBrainzId: place.id,
		name,
		searchParameters: venueSearchParameters(name, city),
		source: 'musicbrainz',
		type: place.type ?? null,
		uid: place.id,
	};
}

/**
 * Az ország nevei, amennyi a város-mező eldöntéséhez kell. Csak az kell
 * belőle, hogy az ország neve ne kerüljön városként a dokumentumba.
 */
const COUNTRY_NAMES: Record<string, string> = {
	HU: 'Hungary',
};

function countryName(countryCode: string): string {
	return COUNTRY_NAMES[countryCode.toUpperCase()] ?? countryCode;
}

/**
 * Egy betöltés: az ország helyei, megszűrve, kiírva.
 *
 * Amit nem teszünk: nem törlünk. Egy helyszín, amire koncert hivatkozik, nem
 * tűnhet el azért, mert a MusicBrainzről levették — a hely attól még ott áll.
 * Amelyik hely bezárt, az `active: false`-ra megy, és a form nem kínálja.
 */
export async function syncVenues(
	database: Firestore,
	countryCode: string,
	options: { request?: MusicBrainzRequestOptions } = {}
): Promise<VenueSyncResult> {
	const areaId = await resolveCountryArea(countryCode, options.request);
	const places = await fetchPlaces(areaId, options.request);
	const documents = places
		.filter(isConcertPlace)
		.map((place) => toVenueDocument(place, countryCode))
		.filter((document) => !!document.name);
	const existing = await database.collection(VENUE_COLLECTION).get();
	const held = new Map(existing.docs.map((doc) => [doc.id, doc.data()]));
	// Amit az admin kézzel javított, azt nem írjuk vissza a MusicBrainz
	// változatára: a betöltés a hiányt pótolja, nem a munkát.
	const fresh = documents.filter((document) => {
		const current = held.get(document.uid);

		return !current || current['source'] === 'musicbrainz'
			? !current || changed(current, document)
			: false;
	});

	await writeVenues(database, fresh);

	return {
		scanned: places.length,
		venues: documents.length,
		written: fresh.length,
		unchanged: documents.length - fresh.length,
	};
}

/** Változott-e a helyszín ahhoz képest, ami a Firestore-ban áll. */
function changed(
	current: Record<string, unknown>,
	document: VenueDocument
): boolean {
	const fields: (keyof VenueDocument)[] = [
		'name',
		'city',
		'address',
		'type',
		'closedAt',
		'active',
		'countryCode',
	];

	if (fields.some((field) => current[field] !== document[field])) {
		return true;
	}

	const coordinates = current['coordinates'] as
		| { latitude?: number; longitude?: number }
		| null
		| undefined;

	return (
		(coordinates?.latitude ?? null) !==
			(document.coordinates?.latitude ?? null) ||
		(coordinates?.longitude ?? null) !==
			(document.coordinates?.longitude ?? null)
	);
}

/** A kiírás batchekben, minden batch végén a kliens-cache bumpjával. */
async function writeVenues(
	database: Firestore,
	documents: VenueDocument[]
): Promise<void> {
	if (!documents.length) return;

	const collection = database.collection(VENUE_COLLECTION);

	for (let start = 0; start < documents.length; start += BATCH_LIMIT) {
		const batch = database.batch();

		for (const document of documents.slice(start, start + BATCH_LIMIT)) {
			batch.set(collection.doc(document.uid), stamp(document), {
				merge: true,
			});
		}

		batch.set(
			database.collection('sync').doc('catalog'),
			{
				modifiedAt: {
					[VENUE_COLLECTION]: FieldValue.serverTimestamp(),
				},
			},
			{ merge: true }
		);

		await batch.commit();
	}
}
