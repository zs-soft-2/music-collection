/**
 * Koncert-javaslatok egy Vertex modelltől, a katalógus zenekaraira.
 *
 * Miért a modell és nem egy API: jövőbeli koncertekre nincs olyan ingyenes
 * forrás, amit be lehetne kötni. A MusicBrainz `event` entitása üres (az
 * egész országra két esemény), a jegyirodák API-ja partnerszerződéses, a
 * zenekarok pedig a saját oldalukon és a közösségi médiában hirdetik a
 * turnéjukat. Amit egy kereső megtalál, azt a modell is megtalálja — ha
 * keresni hagyjuk.
 *
 * ÉS MIÉRT A HELYSZÍN FELŐL KÉRDEZÜNK, nem az előadó felől. Mert a katalógus
 * hétszáz zenekarából három magyar, a többi amerikai és skandináv metal: ha
 * előadónként kérdezünk, a keret arra megy el, hogy sorra megtudjuk, egy
 * amerikai underground zenekarnak nincs itthoni koncertje. Mérve: öt előadó
 * = öt kérés = nulla találat, és napi tíz kéréssel hetven nap egy teljes kör
 * a katalóguson. Egyetlen helyszín programja ezzel szemben egy kérésből
 * kiadja a következő fél év összes estjét — a Barba Negráé negyvenhármat,
 * amiből nyolc estén a polc zenekara lép fel. A párosítás a mi dolgunk, és
 * az ingyen van.
 *
 * Ezért a hívás Google Search groundinggal megy. Grounding nélkül a modell a
 * tanítóadatából írna le koncerteket, ami jövő idejű kérdésnél majdnem
 * biztosan kitalált dátum. Groundinggal viszont minden javaslat mögött ott van
 * a hivatkozás, amiből származik — és épp ezt nézi meg az admin, mielőtt
 * jóváhagyja.
 *
 * A javaslat SOHA nem kerül közvetlenül a `concert` kollekcióba. A
 * `concert-suggestion` alatt várja, hogy valaki elolvassa; a nyilvános lapon
 * csak az jelenik meg, ami mbid-del horgonyzott, vagy amit ember átnézett.
 *
 * Az elutasított javaslat megmarad (`reviewState: 'rejected'`), és ez a
 * kollekció fő haszna: a következő futás ugyanazt a rossz estét különben
 * újra felhozná, és az admin hetente újra döntene róla.
 *
 * A naplózás `console`-on megy, és a hibaosztály is saját (`ConcertAiError`),
 * nem `HttpsError`: a `firebase-functions` betöltése a firebase-admin auth
 * láncán át ESM-et húz be, amivel a modul teszt alatt el sem indulna. A
 * callable fordítja a hibát `HttpsError`-rá (`index.ts`) — ugyanaz a minta,
 * mint a fotós kereté és a napi kérdésé. A Cloud Functions a `console`
 * hívásait ugyanúgy strukturált naplóba veszi.
 */

import { Firestore, FieldValue } from 'firebase-admin/firestore';

import { GatewayClient } from './gateway-client';

import { stamp } from './catalog-sync';
import { hungarianCountryName } from './country-name';
import { gameDay } from './daily-question';
import {
	CONCERT_COLLECTION,
	ConcertActDocument,
	toConcertId,
} from './concert-event';
import {
	VENUE_COLLECTION,
	VenueDocument,
	venueSearchParameters,
} from './concert-venue';
import { CatalogArtist, loadCatalogArtists } from './upcoming-release';
import { normalize } from './discogs-match';

export const CONCERT_SUGGESTION_COLLECTION = 'concert-suggestion';
/** `libs/common/api` EntityTypeEnum.Concert — a javaslat is koncert. */
const ENTITY_TYPE = 'Concert';
const APP_SETTING_COLLECTION = 'app-setting';
const CONCERT_SETTING_DOCUMENT = 'concert-ai';
/** Egy Firestore batch 500 művelet; a szinkron-bump is elfér mellette. */
const BATCH_LIMIT = 400;
/** Csak a teljes dátumot fogadjuk el: "2026" vagy "2026-10" nem nap. */
const EXACT_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A keret hibája. Nem `HttpsError`: a callable fordítja azzá (`index.ts`),
 * mint a fotós keretnél — a modul így a firebase-functions burka nélkül is
 * tesztelhető.
 */
export class ConcertAiError extends Error {
	public constructor(
		message: string,
		/** `off`: ki van kapcsolva; `spent`: elfogyott a mai keret. */
		public readonly reason: 'off' | 'spent'
	) {
		super(message);
		this.name = 'ConcertAiError';
	}
}

/**
 * Amit az admin felületről lehet állítani. A prompt nincs köztük: az itt épül
 * a katalógus adataiból, hogy egy hívó ne rajzoltathasson bármit a mi
 * számlánkra.
 *
 * A `libs/api` `ConcertAiSettings`-e ugyanez a típus a kliens oldalon; a
 * functions külön npm-projekt, onnan nem tud importálni, ezért a kettőt együtt
 * kell tartani — mint a `musicbrainz-api.ts`-t és a `MusicBrainzClient`-et.
 */
export interface ConcertAiSettings {
	/** Fut-e egyáltalán a javaslatkérés. Kikapcsolva a költség is nulla. */
	enabled: boolean;
	/** Ennyi helyszínről kérdez egy futás. A kérés száma ennyi. */
	venuesARun: number;
	/** Napi felső korlát a modellkérésekre, hogy egy hiba ne vigyen vagyont. */
	dailyRequestLimit: number;
}

/**
 * A `flash` a keresésre-támaszkodó kérdéshez elég: a munka nem a gondolkodás,
 * hanem az, hogy a találatokból kiolvassa a dátumot és a helyszínt.
 *
 * KIKAPCSOLVA indul, és ez szándékos. A Google Search grounding nem a tokenek
 * árán megy: a Vertex kérésenként számolja, nagyságrendileg néhány centet
 * grounded promptonként. Előadónként egy kérés megy, tehát egy ötven előadós
 * futás már a teljes havi GCP-keretet (a `infra/modules/cost-alerts` $5-ét)
 * elviheti — a badge-generálás egy képe ezzel szemben ritka és kicsi.
 *
 * Ezért a számok kicsik, és a kapcsolót az adminnak kell felvinnie, amikor
 * eldöntötte, mennyit szán rá. A keret a hívás ELŐTT fogy (`reserveRequests`),
 * a bukott kérés is beszámít, és a felület kiírja, mennyi maradt a mai napra.
 */
export const DEFAULT_CONCERT_AI_SETTINGS: ConcertAiSettings = {
	enabled: false,
	venuesARun: 5,
	dailyRequestLimit: 10,
};

/** Felső korlátok: az admin elírása ne vigyen el egy havi keretet. */
const MAX_VENUES_A_RUN = 40;
const MAX_DAILY_REQUESTS = 300;

export async function readConcertAiSettings(
	database: Firestore
): Promise<ConcertAiSettings> {
	const snapshot = await database
		.collection(APP_SETTING_COLLECTION)
		.doc(CONCERT_SETTING_DOCUMENT)
		.get();

	return { ...DEFAULT_CONCERT_AI_SETTINGS, ...(snapshot.data() ?? {}) };
}

/** Az admin felület mentése. Csak az ismert mezők mennek át. */
export function sanitizeConcertAiSettings(data: unknown): ConcertAiSettings {
	const input = (data ?? {}) as Partial<ConcertAiSettings>;
	const positive = (value: unknown, fallback: number, max: number): number =>
		typeof value === 'number' && Number.isFinite(value) && value > 0
			? Math.min(Math.floor(value), max)
			: fallback;
	const text = (value: unknown, fallback: string): string =>
		typeof value === 'string' && value.trim() ? value.trim() : fallback;

	return {
		// Nem `!== false`: a hiányzó mező itt „nem kapcsoltuk be"-t jelent, és
		// egy felületről érkező üres mentés nem indíthatja el a költést.
		enabled: input.enabled === true,
		venuesARun: positive(
			input.venuesARun,
			DEFAULT_CONCERT_AI_SETTINGS.venuesARun,
			MAX_VENUES_A_RUN
		),
		dailyRequestLimit: positive(
			input.dailyRequestLimit,
			DEFAULT_CONCERT_AI_SETTINGS.dailyRequestLimit,
			MAX_DAILY_REQUESTS
		),
	};
}

/**
 * A napi keret levonása, a hívások ELŐTT. Ugyanaz a minta, mint a
 * badge-generálásnál: a számláló a limit mellett, ugyanabban a dokumentumban,
 * tranzakcióban — két egyszerre futó admin se csúszhasson át rajta.
 *
 * Előre vonunk le, mert a bukott kérés is kérés. Amit nem használtunk fel
 * (mert kevesebb előadó jött össze), azt visszaadjuk.
 */
export async function reserveRequests(
	database: Firestore,
	wanted: number
): Promise<{
	granted: number;
	settings: ConcertAiSettings;
	left: number;
	/** A helyszín-kör állása, ahol az előző futás abbahagyta. */
	cursor: number;
}> {
	const reference = database
		.collection(APP_SETTING_COLLECTION)
		.doc(CONCERT_SETTING_DOCUMENT);
	const day = gameDay(new Date());

	return database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);
		const settings = {
			...DEFAULT_CONCERT_AI_SETTINGS,
			...(snapshot.data() ?? {}),
		} as ConcertAiSettings & {
			usage?: { day?: string; requests?: number };
			venueCursor?: number;
		};

		if (!settings.enabled) {
			throw new ConcertAiError(
				'A koncert-javaslatok ki vannak kapcsolva.',
				'off'
			);
		}

		const used =
			settings.usage?.day === day ? (settings.usage.requests ?? 0) : 0;
		const left = Math.max(0, settings.dailyRequestLimit - used);

		if (!left) {
			throw new ConcertAiError(
				`A mai keret (${settings.dailyRequestLimit} kérés) elfogyott.`,
				'spent'
			);
		}

		const granted = Math.min(wanted, left);

		transaction.set(
			reference,
			{ usage: { day, requests: used + granted } },
			{ merge: true }
		);

		return {
			granted,
			settings,
			left: left - granted,
			cursor:
				typeof settings.venueCursor === 'number'
					? settings.venueCursor
					: 0,
		};
	});
}

/** A fel nem használt keret visszaadása. Csendben: nem ez a futás tárgya. */
export async function releaseRequests(
	database: Firestore,
	count: number
): Promise<void> {
	if (count <= 0) return;

	try {
		await database
			.collection(APP_SETTING_COLLECTION)
			.doc(CONCERT_SETTING_DOCUMENT)
			.set(
				{ usage: { requests: FieldValue.increment(-count) } },
				{ merge: true }
			);
	} catch (error) {
		console.warn('A koncert-keret visszaadása nem sikerült', error);
	}
}

/** Egy javaslat, ahogy a modelltől jön. Semmi sem garantált benne. */
export interface ProposedConcert {
	date?: string;
	time?: string | null;
	endDate?: string | null;
	/**
	 * A fellépők, a főfellépő elöl. Ez a helyszín programjából jön, és ebből
	 * derül ki, hogy az est érinti-e a polcot.
	 */
	artists?: string[];
	venue?: string;
	city?: string | null;
	title?: string | null;
	eventType?: string | null;
	supportingActs?: string[];
	ticketUrl?: string | null;
	sourceUrl?: string | null;
	confidence?: number | null;
	note?: string | null;
}

/** Egy javaslat úgy, ahogy a Firestore-ba kerül. */
export interface ConcertSuggestionDocument {
	artistImageUrl: string | null;
	artistName: string;
	artistUid: string;
	cancelled: boolean;
	city: string | null;
	confidence: number | null;
	countryCode: string;
	endsAt: string | null;
	entityType: string;
	eventType: 'concert' | 'festival' | 'other';
	/** A teljes műsor, a plakát sorrendjében. A `supportingActs` ennyi névből
	 * áll a főfellépő nélkül — ez viszont a katalógus-találatokat is hozza. */
	lineup: ConcertActDocument[];
	matchedBy: 'name';
	model: string;
	musicBrainzArtistIds: string[];
	musicBrainzEventId: null;
	note: string | null;
	reviewState: 'pending' | 'rejected';
	reviewedAt: number | null;
	reviewedBy: string | null;
	searchParameters: string[];
	source: 'ai';
	sourceUrl: string | null;
	startsAt: string;
	startsAtTime: string | null;
	suggestedAt: number;
	supportingActs: string[];
	ticketUrl: string | null;
	title: string;
	venueName: string;
	venueUid: string | null;
}

export interface SuggestResult {
	/** Ahány helyszín programját elkértük. Ennyi kérés ment ki. */
	venuesQueried: number;
	/** Ahány estet a programokban összesen láttunk. */
	concertsSeen: number;
	/** Azokból ahány a katalógus zenekarát érinti. */
	proposed: number;
	suggested: number;
	duplicates: number;
	rejected: number;
	discarded: number;
	/**
	 * Helyszín, amire a modell nem válaszolt. Enélkül a kliens egy elhasalt
	 * futást nem tud megkülönböztetni egy üres választól: mindkettő nulla
	 * est, és a hiba csak a szerver logjában van.
	 */
	failed: number;
	/** Az első hiba szövege, hogy a lap meg tudja mondani, mi történt. */
	failure: string | null;
	model: string;
	requestsUsed: number;
	requestsLeft: number;
}

/**
 * Amit egy helyszínről kérdezünk.
 *
 * A kérdés a helyszín programjára megy, és minden fellépőt kér, nem csak a
 * főfellépőt: a gyűjtemény zenekara sokszor épp előzenekarként jön el, és egy
 * fesztiválnapon öt ismerős név is lehet. Hogy melyik érdekes, azt mi döntjük
 * el utána a katalógusból — a modellnek nem mondjuk meg, mi van a polcon, mert
 * attól hajlamos lenne megtalálni.
 */
export function buildVenuePrompt(
	venueName: string,
	city: string | null,
	countryName: string,
	window: { from: string; to: string }
): string {
	return [
		`Keresd meg, milyen koncertek lesznek a(z) ${venueName} nevű`,
		`helyszínen (${city ? `${city}, ` : ''}${countryName})`,
		`${window.from} és ${window.to} között.`,
		'',
		'Használd a keresést, és csak olyan fellépést vegyél fel, amit egy',
		'konkrét forrás is kimond (a helyszín programja, jegyértékesítő,',
		'sajtóhír). Az URL-eket ne told ki magadtól: csak olyan címet írj,',
		'amit a találatban láttál, és ha nincs ilyen, hagyd null-on. Egy',
		'kitalált link rosszabb, mint a semmi — azon fog elindulni, aki',
		'ellenőrizné az estét.',
		'',
		'Minden fellépőt sorolj fel, a főfellépővel kezdve — az előzenekarok',
		'ugyanolyan fontosak. Annyi estét adj vissza, amennyit a program',
		'tartalmaz; a teljesség a fontos, nem a rövidség.',
		'',
		'Ha a helyszínnek nincs meghirdetett programja, adj vissza üres listát.',
		'Ez is helyes válasz — ne találj ki estét, és ne írj be olyat, aminek a',
		'dátumát nem mondja ki a forrás.',
		'',
		'A válasz csak JSON legyen, séma:',
		'{"concerts":[{"date":"YYYY-MM-DD","time":"HH:mm vagy null",',
		'"endDate":"YYYY-MM-DD vagy null (csak többnapos fesztiválnál)",',
		'"artists":["a fellépők, a főfellépő elöl"],',
		'"venue":"a helyszín neve","city":"a település",',
		'"title":"az esemény neve","eventType":"concert vagy festival",',
		'"ticketUrl":"jegy URL vagy null","sourceUrl":"a forrás URL-je",',
		'"confidence":0.0-1.0,"note":"egy sor arról, mire alapozod"}]}',
	].join('\n');
}

/**
 * Egy előadó koncertjei a modelltől, keresésre támaszkodva — a gatewayen át.
 *
 * A keresés miatt nem kérhetünk sémához kötött JSON-t: egyik szolgáltató sem
 * tartja be a kettőt egy hívásban, és a gateway a párost meg is tagadja
 * (`WEB_SEARCH_WITH_SCHEMA`). Ezért a JSON-t a szövegből szedjük ki — a prompt
 * ezt kéri, és ami nem így jön, azt eldobjuk.
 *
 * A modellt nem mi nevezzük meg: a gateway választ olyat, ami tud keresni, és
 * a válaszában meg is mondja, melyiket — azt jegyezzük fel a javaslat mellé.
 */
export interface Citation {
	/** A szolgáltató átirányítója; a végleges címre a `resolveSource` oldja fel. */
	uri: string;
	/** Amit a kereső a találatra ír — jellemzően a hoszt neve. */
	title: string;
}

export async function askModel(
	client: GatewayClient,
	prompt: string
): Promise<{
	concerts: ProposedConcert[];
	citations: Citation[];
	model: string;
}> {
	const result = await client.execute({
		capability: 'text.complete',
		input: { prompt, webSearch: true, temperature: 0 },
	});

	if (result.kind !== 'result') {
		throw new Error('A gateway a javaslatkérést végrehajtásnak vette.');
	}

	// A grounding blokk jelenléte maga a tény, hogy keresés futott. Ha hiányzik,
	// a válasz nem forrásokból készült — ilyet nem teszünk a jóváhagyó elé.
	if (!result.grounding) {
		throw new Error('A gateway keresés nélküli választ adott.');
	}

	return {
		concerts: parseConcerts(result.output?.text ?? ''),
		citations: result.grounding.citations.map((citation) => ({
			uri: citation.uri,
			title: citation.title,
		})),
		model: result.model ?? 'ismeretlen',
	};
}

/**
 * A JSON a válasz szövegéből. A modell kerítést tesz körbe, bevezető sort ír
 * elé — ezért a legkülső objektumot keressük meg, nem a teljes szöveget
 * olvassuk.
 */
export function parseConcerts(text: string): ProposedConcert[] {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');

	if (start < 0 || end <= start) return [];

	try {
		const parsed = JSON.parse(text.slice(start, end + 1)) as {
			concerts?: ProposedConcert[];
		};

		return Array.isArray(parsed.concerts) ? parsed.concerts : [];
	} catch {
		return [];
	}
}

/**
 * A helyszín, amit a javaslat megnevez, a betöltött helyszínek között.
 * Normalizált névre illeszt, és a városra is ránéz: két `Kultúrház` nevű hely
 * két különböző településen nem ugyanaz.
 */
export function matchVenue(
	name: string,
	city: string | null,
	venues: VenueDocument[]
): VenueDocument | null {
	const key = normalize(name);

	if (!key) return null;

	const named = venues.filter((venue) => normalize(venue.name) === key);

	if (named.length === 1) return named[0];

	if (named.length > 1 && city) {
		const inCity = named.find(
			(venue) => normalize(venue.city) === normalize(city)
		);

		if (inCity) return inCity;
	}

	return null;
}

/** `19:30` marad, minden más elhagyva. */
function toTime(time: string | null | undefined): string | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim());

	return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

/**
 * A műsor névsora, a katalógussal összevetve.
 *
 * Egyszer, a javasláskor készül el, és a jóváhagyás csak átemeli a koncertbe.
 * A lap nem tudná megcsinálni: ahhoz a katalógus összes zenekarát le kellene
 * töltenie, pedig koncerteket olvas, nem előadókat.
 */
export function toLineup(
	names: string[],
	byName: Map<string, CatalogArtist> = new Map()
): ConcertActDocument[] {
	const acts: ConcertActDocument[] = [];
	const seen = new Set<string>();

	for (const raw of names) {
		const name = String(raw ?? '').trim();
		const key = normalize(name);

		if (!name || seen.has(key)) continue;

		seen.add(key);

		const artist = byName.get(key);

		acts.push({
			artistUid: artist?.uid ?? null,
			imageUrl: artist?.imageUrl ?? null,
			name,
		});
	}

	return acts;
}

/**
 * Egy javaslat a mi dokumentumunkként, ha van benne nap és helyszín. Ami
 * kilóg az ablakból, annak nem hiszünk: a modell szívesen ír a jövő évre.
 */
export function toSuggestionDocument(
	proposed: ProposedConcert,
	artist: CatalogArtist,
	venues: VenueDocument[],
	countryCode: string,
	model: string,
	window: { from: string; to: string },
	now: number,
	fallbackSource: string | null,
	byName?: Map<string, CatalogArtist>
): ConcertSuggestionDocument | null {
	const date = (proposed.date ?? '').trim();
	const venueName = (proposed.venue ?? '').trim();

	if (!EXACT_DATE.test(date) || !venueName) return null;
	if (date < window.from || date > window.to) return null;

	const city = proposed.city?.trim() || null;
	const venue = matchVenue(venueName, city, venues);
	const end = (proposed.endDate ?? '').trim();
	const eventType =
		(proposed.eventType ?? '').toLowerCase() === 'festival'
			? 'festival'
			: 'concert';
	const confidence =
		typeof proposed.confidence === 'number' &&
		Number.isFinite(proposed.confidence)
			? Math.min(1, Math.max(0, proposed.confidence))
			: null;
	// A műsor, ahogy a program írja. Ha a modell nem adott névsort, a
	// főfellépő és az előzenekarok együtt is kiadják ugyanazt.
	const bill = (proposed.artists ?? []).length
		? (proposed.artists as string[])
		: [artist.name, ...(proposed.supportingActs ?? [])];

	return {
		artistImageUrl: artist.imageUrl,
		artistName: artist.name,
		artistUid: artist.uid,
		cancelled: false,
		city: venue?.city ?? city,
		confidence,
		countryCode: countryCode.toUpperCase(),
		endsAt: EXACT_DATE.test(end) && end > date ? end : null,
		entityType: ENTITY_TYPE,
		eventType,
		lineup: toLineup(bill, byName),
		matchedBy: 'name',
		model,
		musicBrainzArtistIds: artist.musicBrainzId
			? [artist.musicBrainzId]
			: [],
		musicBrainzEventId: null,
		note: proposed.note?.trim() || null,
		reviewState: 'pending',
		reviewedAt: null,
		reviewedBy: null,
		searchParameters: venueSearchParameters(
			`${artist.name} ${venue?.name ?? venueName}`,
			venue?.city ?? city
		),
		source: 'ai',
		sourceUrl: proposed.sourceUrl?.trim() || fallbackSource,
		startsAt: date,
		startsAtTime: toTime(proposed.time),
		suggestedAt: now,
		supportingActs: (proposed.supportingActs ?? [])
			.map((name) => name.trim())
			.filter((name) => !!name),
		ticketUrl: proposed.ticketUrl?.trim() || null,
		title: proposed.title?.trim() || `${artist.name} — ${venueName}`,
		venueName: venue?.name ?? venueName,
		venueUid: venue?.uid ?? null,
	};
}

/**
 * A hivatkozás, ami tényleg odavezet.
 *
 * Amit a modell URL-ként kiír, az találgatás: a Barba Negra oldala minden
 * útvonalra ugyanazt a lapot adja vissza, tehát a kitalált
 * `/events/amon-amarth` szerver felől nézve „él" (200), a böngészőben
 * viszont sehova sem visz. Amit a modell OLVASOTT, az a grounding
 * hivatkozásaiban van — csakhogy azok a Vertex átirányítói, és lejárnak.
 * Ezért feloldjuk őket: egy kérés, és a végleges cím marad meg, amit egy
 * hónap múlva is meg lehet nyitni.
 */
export async function resolveSource(
	url: string,
	fetchImpl: typeof fetch = fetch
): Promise<string | null> {
	try {
		const response = await fetchImpl(url, { redirect: 'follow' });

		return response.ok && response.url ? response.url : null;
	} catch {
		// Egy döglött hivatkozás nem viszi el a futást; a javaslat marad
		// forrás nélkül, és a felület ezt meg is mondja.
		return null;
	}
}

/** A cím hosztja, `www.` nélkül; ennyi kell az összevetéshez. */
export function hostname(url: string | null | undefined): string {
	try {
		return new URL(String(url)).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/**
 * Melyik grounding hivatkozás tartozik az esthez.
 *
 * Ha a modell megnevezett egy hosztot, azt keressük meg a találatai között:
 * a `web.title` jellemzően maga a hoszt. Így a javaslat arra a lapra mutat,
 * amiből az adatai származnak, nem egy másik est hirdetésére. Ha nincs
 * egyezés, az első találat is többet ér, mint egy kitalált cím.
 */
export function pickCitation(
	proposedUrl: string | null | undefined,
	citations: Citation[]
): string | null {
	if (!citations.length) return null;

	const host = hostname(proposedUrl);
	const match = host
		? citations.find(
				(citation) =>
					hostname(citation.uri) === host ||
					citation.title.toLowerCase().includes(host)
			)
		: undefined;

	return (match ?? citations[0]).uri;
}

/**
 * Melyik helyszínekről kérdezzünk.
 *
 * Egy futás néhány helyet visz (a keret ennyit enged), ezért a sorrend
 * számít. Elöl a koncertre való helyek — egy templomkert, egy múzeum vagy egy
 * hangstúdió ritkán ad estet —, és onnan a kurzorral körbe, hogy ne ugyanaz a
 * tíz hely kapja el minden nap a keretet. A lista stabil, tehát a kurzor is
 * ott folytatja, ahol az előző futás abbahagyta.
 */
export const CONCERT_STAGES = new Set([
	'Club',
	'Festival stage',
	'Indoor arena',
	'Park',
	'Stadium',
	'Venue',
]);

export function chooseVenues(
	venues: VenueDocument[],
	cursor: number,
	count: number
): VenueDocument[] {
	const ordered = [...venues]
		.filter((venue) => venue.active !== false)
		.sort((left, right) => {
			const rank = (venue: VenueDocument): number =>
				CONCERT_STAGES.has(venue.type ?? '') ? 0 : 1;

			return (
				rank(left) - rank(right) ||
				left.name.localeCompare(right.name, 'hu')
			);
		});

	if (!ordered.length || count <= 0) return [];

	const length = ordered.length;
	const start = ((cursor % length) + length) % length;

	return Array.from({ length: Math.min(count, length) }, (unused, index) => {
		const venue = ordered[(start + index) % length];

		return venue;
	});
}

/**
 * A fellépők közül azok, akik a polcon vannak.
 *
 * Normalizált néven illesztünk: a program „AMON AMARTH"-ot ír, a katalógus
 * „Amon Amarth"-ot, és a `normalize` a névelőt meg az írásjeleket is elhagyja.
 * Ami nem egyezik pontosan, azt nem találgatjuk ki — egy rossz párosítás a
 * gyűjtő lapjára tenne idegen zenekart.
 */
export function matchCatalogArtists(
	names: string[],
	byName: Map<string, CatalogArtist>
): CatalogArtist[] {
	const found = new Map<string, CatalogArtist>();

	for (const name of names) {
		const artist = byName.get(normalize(name));

		if (artist && !found.has(artist.uid)) found.set(artist.uid, artist);
	}

	return [...found.values()];
}

/**
 * Egy futás: néhány helyszín, helyszínenként egy modellkérés, és ami a
 * programból a polcot érinti, az a javaslatok közé kerül — pending
 * állapotban, soha nem a `concert` alá.
 */
export async function suggestConcerts(
	database: Firestore,
	countryCode: string,
	client: GatewayClient,
	options: {
		venueUids?: string[];
		today?: Date;
		windowDays?: number;
		/**
		 * A forrás-hivatkozások feloldásához, nem modellhíváshoz: a gateway
		 * átirányítókat ad tovább, és a jóváhagyó a végleges címet nyitja meg.
		 */
		fetchImpl?: typeof fetch;
	} = {}
): Promise<SuggestResult> {
	const today = options.today ?? new Date();
	const to = new Date(today);

	to.setUTCDate(to.getUTCDate() + (options.windowDays ?? 180));

	const window = {
		from: today.toISOString().slice(0, 10),
		to: to.toISOString().slice(0, 10),
	};
	const [artists, venueSnapshot, concertSnapshot, suggestionSnapshot] =
		await Promise.all([
			loadCatalogArtists(database),
			database.collection(VENUE_COLLECTION).get(),
			database.collection(CONCERT_COLLECTION).get(),
			database.collection(CONCERT_SUGGESTION_COLLECTION).get(),
		]);
	const venues = venueSnapshot.docs.map(
		(document) =>
			({ ...document.data(), uid: document.id }) as VenueDocument
	);
	const byName = new Map(
		artists.map((artist) => [normalize(artist.name), artist])
	);
	const held = new Set(concertSnapshot.docs.map((document) => document.id));
	const decided = new Map(
		suggestionSnapshot.docs.map((document) => [
			document.id,
			document.get('reviewState') as string,
		])
	);
	// Egy zenekar egy este egy helyen játszik. Ennyi a duplikátum ismérve —
	// a helyszín nem lehet benne, mert ugyanazt a házat a program hol a
	// nevén, hol a színpadján említi, és két helyszín-kérdés ugyanarra az
	// estére is ráfuthat (egy klub és a kertje külön hely a listában).
	const nights = new Set(
		[...concertSnapshot.docs, ...suggestionSnapshot.docs].map(
			(document) =>
				`${document.get('artistUid') as string}|` +
				`${document.get('startsAt') as string}`
		)
	);
	const wanted = options.venueUids?.length
		? venues.filter((venue) => options.venueUids?.includes(venue.uid))
		: null;
	const { granted, settings, left, cursor } = await reserveRequests(
		database,
		wanted?.length ?? DEFAULT_CONCERT_AI_SETTINGS.venuesARun
	);
	const chosen =
		wanted ??
		chooseVenues(venues, cursor, Math.min(granted, settings.venuesARun));
	const asked = chosen.slice(0, granted);

	// Amit nem használunk fel, azt visszaadjuk: a keret nem fogyhat el
	// amiatt, hogy kevesebb helyszín jött össze, mint amennyit lefoglaltunk.
	await releaseRequests(database, granted - asked.length);

	const now = Date.now();
	const documents: ConcertSuggestionDocument[] = [];
	/** Feloldott hivatkozások a futás alatt; egy lap sok estet hirdet. */
	const resolved = new Map<string, string | null>();
	let concertsSeen = 0;
	let proposed = 0;
	let duplicates = 0;
	let rejected = 0;
	let discarded = 0;
	let failed = 0;
	let failure: string | null = null;

	/** Amelyik modellt a gateway választotta; a javaslatok mellé ez kerül. */
	let answeringModel = 'ismeretlen';

	for (const venue of asked) {
		let answer: {
			concerts: ProposedConcert[];
			citations: Citation[];
			model: string;
		};

		try {
			answer = await askModel(
				client,
				buildVenuePrompt(
					venue.name,
					venue.city,
					hungarianCountryName(countryCode),
					window
				)
			);
			answeringModel = answer.model;
		} catch (error) {
			// Egy bukott kérés egy helyszínt visz, nem a futást. A keretet már
			// levontuk érte: a kérés elment, fizetni is kell. A kliens viszont
			// megtudja: egy logbejegyzés annak szól, aki a Cloud Console-t
			// nézi, nem annak, aki a gombot nyomta.
			console.warn(`A modell ${venue.name}-ra hibát adott`, error);
			failed += 1;
			failure ??= error instanceof Error ? error.message : `${error}`;
			continue;
		}

		concertsSeen += answer.concerts.length;

		for (const concert of answer.concerts) {
			const lineup = (concert.artists ?? [])
				.map((name) => String(name ?? '').trim())
				.filter((name) => !!name);
			const known = matchCatalogArtists(lineup, byName);

			// A program legnagyobb része nem érint minket. Ez nem hiba, és nem
			// is kerül naplóba: ezért kérdeztük a helyszínt, nem az előadót.
			if (!known.length) continue;

			proposed += known.length;

			// Amit a modell forrásként kiírt, azt nem hisszük el: a hozzá
			// tartozó grounding hivatkozást oldjuk fel, és az lesz a link.
			// Futásonként egyszer, mert ugyanaz a lap sok estet hirdet.
			const citation = pickCitation(concert.sourceUrl, answer.citations);
			const source = citation
				? ((resolved.has(citation)
						? resolved.get(citation)
						: resolved
								.set(
									citation,
									await resolveSource(
										citation,
										options.fetchImpl
									)
								)
								.get(citation)) ?? null)
				: null;
			// A jegylinket a modell szintén kitalálhatja. Csak akkor tartjuk
			// meg, ha a kereső is járt azon a hoszton.
			const ticketUrl =
				concert.ticketUrl &&
				answer.citations.some(
					(found) =>
						hostname(found.uri) === hostname(concert.ticketUrl) ||
						found.title
							.toLowerCase()
							.includes(hostname(concert.ticketUrl))
				)
					? concert.ticketUrl
					: null;

			for (const artist of known) {
				const document = toSuggestionDocument(
					{
						...concert,
						sourceUrl: source,
						ticketUrl,
						// A helyszín az, amit kérdeztünk. A program hol a
						// házat írja, hol a színpadát („Barba Negra Red
						// Stage"), és abból két külön est lenne ugyanarra az
						// éjszakára; a színpad neve a címben marad meg.
						venue: venue.name,
						city: venue.city ?? concert.city?.trim() ?? null,
						// A többi fellépő a műsor, ahogy a lapon megjelenik.
						supportingActs: lineup.filter(
							(name) => normalize(name) !== normalize(artist.name)
						),
					},
					artist,
					venues,
					countryCode,
					answeringModel,
					window,
					now,
					source,
					byName
				);

				if (!document) {
					discarded += 1;
					continue;
				}

				const uid = toConcertId(
					document.artistUid,
					document.startsAt,
					document.venueName
				);

				const night = `${document.artistUid}|${document.startsAt}`;

				// Már be van iktatva koncertként, vagy ugyanarra az estére
				// már áll egy javaslat — a MusicBrainz is tudta, egy korábbi
				// futás is felhozta, vagy a szomszéd helyszín kérdése.
				if (held.has(uid) || nights.has(night)) {
					duplicates += 1;
					continue;
				}

				nights.add(night);

				// Egyszer már elutasították. Ez a kollekció fő haszna: ugyanazt
				// a rossz estét nem hozzuk fel újra.
				if (decided.get(uid) === 'rejected') {
					rejected += 1;
					continue;
				}

				documents.push({
					...document,
					uid,
				} as ConcertSuggestionDocument & { uid: string });
			}
		}
	}

	await writeSuggestions(database, documents);

	// A kurzor csak akkor lép, ha a futás maga választott: egy célzott
	// újrakérdezés ne forgassa el a kört.
	if (!wanted) await advanceCursor(database, cursor + asked.length);

	return {
		venuesQueried: asked.length,
		concertsSeen,
		proposed,
		suggested: documents.length,
		duplicates,
		rejected,
		discarded,
		failed,
		failure,
		model: answeringModel,
		requestsUsed: asked.length,
		requestsLeft: left + (granted - asked.length),
	};
}

/** A kör állása a következő futásnak. Csendben: nem ez a futás tárgya. */
async function advanceCursor(
	database: Firestore,
	cursor: number
): Promise<void> {
	try {
		await database
			.collection(APP_SETTING_COLLECTION)
			.doc(CONCERT_SETTING_DOCUMENT)
			.set({ venueCursor: cursor }, { merge: true });
	} catch (error) {
		console.warn('A helyszín-kurzor mentése nem sikerült', error);
	}
}

/** A kiírás batchekben, minden batch végén a kliens-cache bumpjával. */
async function writeSuggestions(
	database: Firestore,
	documents: (ConcertSuggestionDocument & { uid?: string })[]
): Promise<void> {
	if (!documents.length) return;

	const collection = database.collection(CONCERT_SUGGESTION_COLLECTION);

	for (let start = 0; start < documents.length; start += BATCH_LIMIT) {
		const batch = database.batch();

		for (const document of documents.slice(start, start + BATCH_LIMIT)) {
			const uid =
				document.uid ??
				toConcertId(
					document.artistUid,
					document.startsAt,
					document.venueName
				);

			batch.set(collection.doc(uid), stamp({ ...document, uid }), {
				merge: true,
			});
		}

		batch.set(
			database.collection('sync').doc('catalog'),
			{
				modifiedAt: {
					[CONCERT_SUGGESTION_COLLECTION]:
						FieldValue.serverTimestamp(),
				},
			},
			{ merge: true }
		);

		await batch.commit();
	}
}
