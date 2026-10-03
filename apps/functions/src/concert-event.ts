/**
 * Koncertek a MusicBrainzről, a katalógus előadóira.
 *
 * A kérdés nem az, mi van műsoron az országban, hanem az, hogy a polcon lévő
 * zenekarok közül melyik játszik — ez a lap egyetlen dolga. Ezért a betöltés
 * az `artist` kollekcióból indul, nem a helyszínekből: kötegenként tizenöt
 * MusicBrainz-azonosító egy keresésben, a dátumtartománnyal együtt. A kérések
 * száma így a katalógus méretén múlik, nem a világ eseményszámán.
 *
 * Amit tudni kell erről a forrásról: az `event` entitás gyakorlatilag üres.
 * Magyarországra két esemény van benne összesen, és a jövőbeli események
 * száma világszerte sem éri el a kétezret. Ez a betöltés tehát nem fogja
 * megtölteni a lapot — azért van, mert amit a MusicBrainz tud, az mbid-del
 * horgonyzott, ingyen van, és ellenőrizhető. A lap tartalmát a modell
 * javaslatai adják (`concert-suggestion.ts`), emberi jóváhagyással.
 *
 * Csak azokat az előadókat kérdezzük, akiknek van MusicBrainz-azonosítójuk:
 * a név szerinti keresés névrokont is hoz, és az eseményeknél nincs mivel
 * kizárni (egy lemeznél a kiadás-adatok még segítenek, egy koncertnél nem).
 * A többi előadó a modellre marad, ahol a név maga a kérdés.
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';

import { stamp, tombstone } from './catalog-sync';
import { CatalogArtist, isoDay, loadCatalogArtists } from './upcoming-release';
import { MusicBrainzRequestOptions, musicBrainzGet } from './musicbrainz-api';
import {
	VENUE_COLLECTION,
	VenueDocument,
	venueSearchParameters,
} from './concert-venue';

export const CONCERT_COLLECTION = 'concert';
/** `libs/common/api` EntityTypeEnum.Concert. */
const ENTITY_TYPE = 'Concert';
/**
 * Ennyi előadó megy egy keresésbe. Ugyanaz a korlát, mint a megjelenéseknél:
 * a Lucene-lekérdezés hossza és a köteg találatszáma szabja meg.
 */
export const ARTISTS_A_QUERY = 15;
/** A keresés lapmérete; a MusicBrainz ennél nagyobbat nem ad. */
const PAGE_SIZE = 100;
/** Egy keresésből ennyi találat kérhető el összesen (`offset + limit`). */
const MAX_RESULTS = 500;
/** Egy Firestore batch 500 művelet; a szinkron-bump is elfér mellette. */
const BATCH_LIMIT = 400;
/** Csak a teljes dátumot fogadjuk el: "2026" vagy "2026-10" nem nap. */
const EXACT_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Amit a MusicBrainz egy esemény-találatban ad. */
export interface MusicBrainzSearchEvent {
	id: string;
	name?: string;
	type?: string | null;
	time?: string | null;
	cancelled?: boolean;
	disambiguation?: string | null;
	'life-span'?: { begin?: string | null; end?: string | null } | null;
	/**
	 * A keresés is kiadja a kapcsolatokat — az előadót és a helyszínt is.
	 * Ezért egy találathoz nem kell külön lookup, ami eseményenként egy
	 * másodperc várakozás lenne.
	 */
	relations?: {
		type?: string;
		artist?: { id?: string; name?: string };
		place?: { id?: string; name?: string };
	}[];
}

interface MusicBrainzEventSearch {
	count?: number;
	events?: MusicBrainzSearchEvent[];
}

/** Amit egy helyszín-lookup ad, amennyi az ország eldöntéséhez kell. */
interface MusicBrainzPlaceLookup {
	id: string;
	name?: string;
	type?: string | null;
	address?: string | null;
	coordinates?: { latitude?: string; longitude?: string } | null;
	area?: {
		id?: string;
		name?: string;
		'iso-3166-1-codes'?: string[];
		'iso-3166-2-codes'?: string[];
	} | null;
	relations?: {
		type?: string;
		area?: { name?: string; 'iso-3166-1-codes'?: string[] };
	}[];
}

/**
 * Egy fellépő a műsorból, a katalógussal összevetve.
 *
 * Az `artistUid` csak akkor kerül bele, ha a név (vagy mbid) biztosan a mi
 * zenekarunk: a lapon ez a név linkké válik, és egy rossz link idegen
 * zenekar lemezeihez viszi a gyűjtőt.
 */
export interface ConcertActDocument {
	name: string;
	artistUid: string | null;
	imageUrl: string | null;
}

/** Egy koncert úgy, ahogy a Firestore-ba kerül. */
export interface ConcertDocument {
	artistImageUrl: string | null;
	artistName: string;
	artistUid: string;
	cancelled: boolean;
	city: string | null;
	countryCode: string;
	endsAt: string | null;
	entityType: string;
	eventType: 'concert' | 'festival' | 'other';
	/** A teljes műsor, ahogy az esemény felsorolja; mbid-del párosítva. */
	lineup: ConcertActDocument[];
	matchedBy: 'musicBrainzId' | 'name' | 'manual';
	musicBrainzArtistIds: string[];
	musicBrainzEventId: string | null;
	searchParameters: string[];
	source: 'musicbrainz' | 'ai' | 'manual';
	sourceUrl: string | null;
	startsAt: string;
	startsAtTime: string | null;
	supportingActs: string[];
	ticketUrl: string | null;
	title: string;
	venueName: string;
	venueUid: string | null;
}

export interface ConcertSyncResult {
	artistsQueried: number;
	/**
	 * Ahány találatot a keresések hoztak. Ugyanaz a fesztivál annyiszor jön
	 * vissza, ahány kötegben szerepel a fellépője — ez a szám tehát a nyers
	 * találaté, nem a különböző eseményeké.
	 */
	eventsScanned: number;
	/** Ahány különböző esemény párosult a katalógus előadóival. */
	matched: number;
	/** Ahány koncert íródott ki: egy eseményen minden ismerős fellépőre egy. */
	written: number;
	deleted: number;
	venuesCreated: number;
}

/** A keresés dátumtartománya: ma és a következő `days` nap. */
export function concertWindow(
	today: Date,
	days: number
): { from: string; to: string } {
	const to = new Date(today);

	to.setUTCDate(to.getUTCDate() + days);

	return { from: isoDay(today), to: isoDay(to) };
}

/**
 * A koncert azonosítója: előadó, nap, helyszín. Ugyanaz a képlet, mint a
 * kliensen (`toConcertId`) — mindkét betöltés újra és újra lefut, és egy
 * véletlen azonosító ugyanazt az estét többször is beírná.
 */
export function toConcertId(
	artistUid: string,
	startsAt: string,
	venueName: string
): string {
	const place = venueName
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return `${artistUid}_${startsAt}_${place || 'venue'}`;
}

/** Egy köteg előadó egy keresésben, a dátumtartománnyal együtt. */
export async function fetchEventsForArtists(
	artists: CatalogArtist[],
	window: { from: string; to: string },
	request?: MusicBrainzRequestOptions
): Promise<MusicBrainzSearchEvent[]> {
	const withId = artists.filter((artist) => !!artist.musicBrainzId);
	const events: MusicBrainzSearchEvent[] = [];

	for (let start = 0; start < withId.length; start += ARTISTS_A_QUERY) {
		const batch = withId.slice(start, start + ARTISTS_A_QUERY);
		const ids = batch
			.map((artist) => artist.musicBrainzId)
			.join(' OR ');
		const query =
			`arid:(${ids}) AND begin:[${window.from} TO ${window.to}]`;
		let offset = 0;
		let total = Number.POSITIVE_INFINITY;

		while (offset < Math.min(total, MAX_RESULTS)) {
			const page = await musicBrainzGet<MusicBrainzEventSearch>(
				'/event',
				{ query, limit: PAGE_SIZE, offset },
				request
			);

			total = page.count ?? 0;
			events.push(...(page.events ?? []));

			if (!page.events?.length) break;

			offset += PAGE_SIZE;
		}
	}

	return events;
}

/**
 * A fellépők, ahogy a kapcsolatok mondják; a főszereplők elöl, az egyenlők
 * a forrás sorrendjében. A rangsor kivonásával rendezünk, mert a „bal oldal
 * főszereplő, tehát előbbre" alakú hasonlítás két főszereplőre is -1-et ad,
 * és attól a rendezés meg is fordíthatja őket.
 */
export function performers(
	event: MusicBrainzSearchEvent
): { id: string | null; name: string }[] {
	const rank = (type: string | undefined): number =>
		type === 'main performer' ? 0 : 1;

	return (event.relations ?? [])
		.filter((relation) => !!relation.artist)
		.sort((left, right) => rank(left.type) - rank(right.type))
		.map((relation) => ({
			id: relation.artist?.id ?? null,
			name: relation.artist?.name ?? '',
		}));
}

/**
 * A műsor névsora: minden fellépő egyszer, a katalógus-találat uid-jával és
 * képével. Az összevetés mbid-en megy, nem néven — az esemény és a katalógus
 * ugyanazt az azonosítót használja, úgyhogy itt nincs mit eltalálni.
 *
 * Egyszer, a betöltéskor készül el: a lap koncerteket olvas, nem előadókat, és
 * a párosításhoz az egész katalógust le kellene töltenie.
 */
export function toEventLineup(
	credited: { id: string | null; name: string }[],
	artists: Map<string, CatalogArtist>
): ConcertActDocument[] {
	const acts: ConcertActDocument[] = [];
	const seen = new Set<string>();

	for (const credit of credited) {
		const artist = credit.id
			? artists.get(credit.id.toLowerCase())
			: undefined;
		const name = credit.name || artist?.name || '';
		const key = (artist?.uid ?? name).toLowerCase();

		if (!name || seen.has(key)) continue;

		seen.add(key);
		acts.push({
			artistUid: artist?.uid ?? null,
			imageUrl: artist?.imageUrl ?? null,
			name,
		});
	}

	return acts;
}

/** A helyszín, ahogy a kapcsolatok mondják. */
export function heldAt(
	event: MusicBrainzSearchEvent
): { id: string; name: string } | null {
	const place = (event.relations ?? []).find(
		(relation) => !!relation.place
	)?.place;

	return place?.id ? { id: place.id, name: place.name ?? '' } : null;
}

/** `Concert`, `Festival`, minden más. */
export function toEventType(
	type: string | null | undefined
): 'concert' | 'festival' | 'other' {
	const name = (type ?? '').toLowerCase();

	if (name === 'concert') return 'concert';
	if (name === 'festival') return 'festival';

	return 'other';
}

/**
 * Egy esemény a mi dokumentumainkként: a katalógus minden fellépőjére egy.
 * Egy fesztiválon három ismerős zenekar három koncert, mert mindhármat a
 * maga előadójának a lapján keresi az, akit érdekel. Üres tömb, ha a nap
 * hiányos, a helyszín ismeretlen, vagy egyik fellépő sem a katalógusé — a
 * hiányos eseményt nem találgatjuk ki.
 */
export function toConcertDocuments(
	event: MusicBrainzSearchEvent,
	artists: Map<string, CatalogArtist>,
	venues: Map<string, VenueDocument>
): ConcertDocument[] {
	const begin = event['life-span']?.begin ?? null;

	if (!begin || !EXACT_DATE.test(begin)) return [];

	const place = heldAt(event);
	const venue = place ? venues.get(place.id) : undefined;

	if (!venue) return [];

	const credited = performers(event);
	const end = event['life-span']?.end ?? null;
	const endsAt = end && EXACT_DATE.test(end) && end !== begin ? end : null;
	const documents = new Map<string, ConcertDocument>();

	for (const performer of credited) {
		const artist = performer.id
			? artists.get(performer.id.toLowerCase())
			: undefined;

		// Ugyanaz a zenekar két kapcsolattal — főszereplő és előzenekar is —
		// egyetlen est marad.
		if (!artist || documents.has(artist.uid)) continue;

		documents.set(artist.uid, {
			artistImageUrl: artist.imageUrl,
			artistName: performer.name || artist.name,
			artistUid: artist.uid,
			cancelled: event.cancelled === true,
			city: venue.city,
			countryCode: venue.countryCode,
			endsAt,
			entityType: ENTITY_TYPE,
			eventType: toEventType(event.type),
			lineup: toEventLineup(credited, artists),
			matchedBy: 'musicBrainzId',
			musicBrainzArtistIds: credited
				.map((credit) => credit.id)
				.filter((id): id is string => !!id),
			musicBrainzEventId: event.id,
			searchParameters: venueSearchParameters(
				`${artist.name} ${venue.name}`,
				venue.city
			),
			source: 'musicbrainz',
			sourceUrl: `https://musicbrainz.org/event/${event.id}`,
			startsAt: begin,
			startsAtTime: toTime(event.time),
			supportingActs: credited
				.filter((credit) => credit.id !== performer.id)
				.map((credit) => credit.name)
				.filter((name) => !!name),
			ticketUrl: null,
			title: event.name?.trim() || `${artist.name} — ${venue.name}`,
			venueName: venue.name,
			venueUid: venue.uid,
		});
	}

	return [...documents.values()];
}

/** `19:30:00` → `19:30`; amit nem értünk, azt elhagyjuk. */
function toTime(time: string | null | undefined): string | null {
	const match = /^(\d{1,2}):(\d{2})/.exec(time ?? '');

	return match
		? `${match[1].padStart(2, '0')}:${match[2]}`
		: null;
}

/**
 * A helyszínek, amikre a koncertek hivatkozhatnak: a betöltött helyek
 * MusicBrainz-azonosító szerint. Ez egyszerre szolgál indexként és
 * országszűrőként — ami nincs a listán, az nem ennek az országnak a helye.
 */
export async function loadVenues(
	database: Firestore
): Promise<Map<string, VenueDocument>> {
	const snapshot = await database.collection(VENUE_COLLECTION).get();
	const venues = new Map<string, VenueDocument>();

	for (const document of snapshot.docs) {
		const venue = { ...document.data(), uid: document.id } as VenueDocument;

		if (venue.musicBrainzId) {
			venues.set(venue.musicBrainzId, venue);
		}
	}

	return venues;
}

/**
 * Egy esemény helyszíne, amit a betöltött lista nem ismer: lekérdezzük, és ha
 * az országban van, felvesszük.
 *
 * Azért érdemes: a helyszín-betöltés csak a tipizált helyeket hozta el, és
 * épp azokról maradt le, amelyeket a MusicBrainz nem tipizált. Ha ott
 * bizonyíthatóan koncert van, akkor az koncerthelyszín — az esemény maga a
 * bizonyíték.
 */
export async function resolveVenue(
	place: { id: string; name: string },
	countryCode: string,
	request?: MusicBrainzRequestOptions
): Promise<VenueDocument | null> {
	let lookup: MusicBrainzPlaceLookup;

	try {
		lookup = await musicBrainzGet<MusicBrainzPlaceLookup>(
			`/place/${place.id}`,
			{ inc: 'area-rels' },
			request
		);
	} catch {
		// Egy hiányzó helyszín nem viszi el a futást; a koncert kimarad.
		return null;
	}

	const codes = [
		...(lookup.area?.['iso-3166-1-codes'] ?? []),
		...(lookup.relations ?? []).flatMap(
			(relation) => relation.area?.['iso-3166-1-codes'] ?? []
		),
	].map((code) => code.toUpperCase());
	const iso2 = lookup.area?.['iso-3166-2-codes']?.[0] ?? '';
	const country = countryCode.toUpperCase();
	// Az ISO 3166-2 kód az országkóddal kezdődik (`HU-BU`), ezért a város
	// area-ja is elárulja az országot — a `place` lookup pedig a várost adja.
	const inCountry = codes.includes(country) || iso2.startsWith(`${country}-`);

	if (!inCountry) return null;

	const latitude = Number(lookup.coordinates?.latitude);
	const longitude = Number(lookup.coordinates?.longitude);
	const name = (lookup.name ?? place.name).trim();
	const city = iso2.startsWith(`${country}-`)
		? (lookup.area?.name ?? null)
		: null;

	return {
		active: true,
		address: lookup.address?.trim() || null,
		city,
		closedAt: null,
		coordinates:
			Number.isFinite(latitude) && Number.isFinite(longitude)
				? { latitude, longitude }
				: null,
		countryCode: country,
		entityType: 'Venue',
		musicBrainzId: lookup.id,
		name,
		searchParameters: venueSearchParameters(name, city),
		source: 'musicbrainz',
		type: lookup.type ?? null,
		uid: lookup.id,
	};
}

/**
 * Egy betöltés: a katalógus előadóinak eseményei, párosítva, kiírva. Ami
 * lejárt vagy eltűnt a MusicBrainzről, markerrel együtt törlődik — a kliens
 * cache-éből is el kell tűnnie.
 */
export async function syncConcerts(
	database: Firestore,
	countryCode: string,
	options: {
		today?: Date;
		windowDays?: number;
		request?: MusicBrainzRequestOptions;
	} = {}
): Promise<ConcertSyncResult> {
	const today = options.today ?? new Date();
	const window = concertWindow(today, options.windowDays ?? 180);
	const [artists, venues, existing] = await Promise.all([
		loadCatalogArtists(database),
		loadVenues(database),
		database.collection(CONCERT_COLLECTION).get(),
	]);
	const byMusicBrainzId = new Map(
		artists
			.filter((artist) => !!artist.musicBrainzId)
			.map((artist) => [artist.musicBrainzId!.toLowerCase(), artist])
	);
	const events = await fetchEventsForArtists(artists, window, options.request);
	const created: VenueDocument[] = [];
	const documents: ConcertDocument[] = [];
	const matched = new Set<string>();

	for (const event of events) {
		const place = heldAt(event);

		// A helyszín, amit a betöltött lista nem ismer: egyszer kérdezzük meg,
		// és ha az országban van, innentől ismert.
		if (place && !venues.has(place.id)) {
			const venue = await resolveVenue(
				place,
				countryCode,
				options.request
			);

			if (venue) {
				venues.set(venue.musicBrainzId!, venue);
				created.push(venue);
			}
		}

		const concerts = toConcertDocuments(event, byMusicBrainzId, venues);

		if (concerts.length) matched.add(event.id);

		documents.push(...concerts);
	}

	const keep = new Map(
		documents.map((document) => [
			toConcertId(
				document.artistUid,
				document.startsAt,
				document.venueName
			),
			document,
		])
	);
	// Lejárt, vagy eltűnt a forrásból. Csak a MusicBrainzről betöltötteket
	// söpörjük: amit admin vett fel vagy hagyott jóvá, az nem a mi dolgunk.
	const stale = existing.docs.filter((document) => {
		const past = (document.get('endsAt') ??
			document.get('startsAt')) as string;

		if (past && past < window.from) return true;

		return (
			document.get('source') === 'musicbrainz' && !keep.has(document.id)
		);
	});

	await writeConcerts(database, keep, created, stale);

	return {
		artistsQueried: artists.filter((artist) => !!artist.musicBrainzId)
			.length,
		eventsScanned: events.length,
		matched: matched.size,
		// A kiírt dokumentumoké, nem a párosításoké: ugyanaz az esemény több
		// kötegből is bejön, és a `keep` ezeket egy estévé vonja össze.
		written: keep.size,
		deleted: stale.length,
		venuesCreated: created.length,
	};
}

/** A kiírás batchekben, minden batch végén a kliens-cache bumpjával. */
async function writeConcerts(
	database: Firestore,
	concerts: Map<string, ConcertDocument>,
	venues: VenueDocument[],
	stale: { ref: FirebaseFirestore.DocumentReference }[]
): Promise<void> {
	const concertCollection = database.collection(CONCERT_COLLECTION);
	const venueCollection = database.collection(VENUE_COLLECTION);
	const operations: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [
		...venues.map(
			(venue) => (batch: FirebaseFirestore.WriteBatch) =>
				batch.set(venueCollection.doc(venue.uid), stamp(venue), {
					merge: true,
				})
		),
		...[...concerts].map(
			([uid, concert]) => (batch: FirebaseFirestore.WriteBatch) =>
				batch.set(concertCollection.doc(uid), stamp(concert), {
					merge: true,
				})
		),
		...stale.map((document) => (batch: FirebaseFirestore.WriteBatch) => {
			const marker = tombstone(database, document.ref);

			batch.delete(document.ref);
			batch.set(marker.reference, marker.data);
		}),
	];

	if (!operations.length) return;

	const keys = venues.length
		? [CONCERT_COLLECTION, VENUE_COLLECTION]
		: [CONCERT_COLLECTION];

	for (let start = 0; start < operations.length; start += BATCH_LIMIT) {
		const batch = database.batch();

		for (const operation of operations.slice(start, start + BATCH_LIMIT)) {
			operation(batch);
		}

		batch.set(
			database.collection('sync').doc('catalog'),
			{
				modifiedAt: Object.fromEntries(
					keys.map((key) => [key, FieldValue.serverTimestamp()])
				),
			},
			{ merge: true }
		);

		await batch.commit();
	}
}
