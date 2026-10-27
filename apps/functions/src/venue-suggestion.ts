/**
 * Helyszín-javaslatok egy modelltől, keresésre támaszkodva — más országokra.
 *
 * Miért kell egyáltalán, amikor a MusicBrainz `place` entitása pont ezen a
 * ponton gazdag: mert nem mindenhol az. Magyarországra 249 hely jön, abból 69
 * `Venue` — ez használható törzsadat. Egy kisebb vagy a MusicBrainzen kevésbé
 * gondozott országra viszont az `?area=` böngészés néhány tucat helyet ad, és
 * a klubok nagy része nincs köztük. Amit egy kereső megtalál (a hely saját
 * oldala, a jegyértékesítő, a város programmagazinja), azt a modell is
 * megtalálja — ha keresni hagyjuk.
 *
 * A javaslat SOHA nem kerül közvetlenül a `venue` kollekcióba. A
 * `venue-suggestion` alatt várja, hogy valaki elolvassa: egy groundolt keresés
 * is nevezhet olyan klubot, ami két éve bezárt, és a helyszín a nyilvános
 * koncertlap törzsadata — arra hivatkozik minden est. Ugyanaz a modell, mint a
 * koncert-javaslatnál ([[concert-suggestion.ts]]), ugyanabból a napi keretből,
 * és ugyanúgy a gatewayen: külön szolgáltatói hívás nem születik.
 *
 * Az elutasított javaslat megmarad (`reviewState: 'rejected'`), és ez a
 * kollekció fő haszna: a következő futás ugyanazt a rossz helyet különben
 * újra felhozná.
 *
 * Amit a modelltől NEM fogadunk el: koordinátát. A cím és a város ellenőrizhető
 * egy pillantással, a koordináta nem — egy kitalált szám a térképen egy
 * mezőre tenné a klubot, és senki nem néz rá. A pontot a MusicBrainz-betöltés
 * vagy az admin adja meg.
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';

import { stamp } from './catalog-sync';
import {
	CONCERT_PLACE_TYPES,
	VENUE_COLLECTION,
	VenueDocument,
	venueSearchParameters,
} from './concert-venue';
import {
	Citation,
	pickCitation,
	releaseRequests,
	reserveRequests,
	resolveSource,
} from './concert-suggestion';
import { hungarianCountryName } from './country-name';
import { normalize } from './discogs-match';
import { GatewayClient } from './gateway-client';

export const VENUE_SUGGESTION_COLLECTION = 'venue-suggestion';
/** `libs/common/api` EntityTypeEnum.Venue — a javaslat is helyszín. */
const ENTITY_TYPE = 'Venue';
/** Egy Firestore batch 500 művelet; a szinkron-bump is elfér mellette. */
const BATCH_LIMIT = 400;
/**
 * Hány helyet kérünk egy kérdésre. Ennél többet egy válasz nem is bír el
 * értelmesen, és a lényeg nem a teljesség: a nagy házak jönnek elöl, a
 * maradékot a következő futás vagy egy városra szűkített kérdés hozza.
 */
const VENUES_AN_ANSWER = 30;

/** Egy javaslat, ahogy a modelltől jön. Semmi sem garantált benne. */
export interface ProposedVenue {
	name?: string;
	city?: string | null;
	address?: string | null;
	/** A mi típus-szókincsünkből; amit nem ismerünk, az `Venue` lesz. */
	type?: string | null;
	/** Ha a modell szerint bezárt, a javaslat elesik. */
	closed?: boolean | null;
	sourceUrl?: string | null;
	confidence?: number | null;
	note?: string | null;
}

/** Egy helyszín-javaslat úgy, ahogy a Firestore-ba kerül. */
export interface VenueSuggestionDocument extends VenueDocument {
	reviewState: 'pending' | 'rejected';
	suggestedAt: number;
	reviewedAt: number | null;
	reviewedBy: string | null;
	confidence: number | null;
	note: string | null;
	model: string | null;
	sourceUrl: string | null;
}

export interface SuggestVenuesResult {
	asked: number;
	venuesSeen: number;
	suggested: number;
	duplicates: number;
	rejected: number;
	discarded: number;
	/**
	 * Kérdés, amire a modell nem válaszolt. Enélkül a kliens egy elhasalt
	 * futást nem tud megkülönböztetni egy üres választól: mindkettő nulla
	 * helyszín, és a hiba csak a szerver logjában van.
	 */
	failed: number;
	/** Az első hiba szövege, hogy a lap meg tudja mondani, mi történt. */
	failure: string | null;
	model: string;
	requestsUsed: number;
	requestsLeft: number;
}

/**
 * A javaslat azonosítója: a név és a város slugja.
 *
 * Ugyanaz a képzés, mint a kliens `toVenueSlug`-jában (`libs/api` …
 * `venue.ts`), és ez szándékos: a jóváhagyás ezen az azonosítón hozza létre a
 * `venue` dokumentumot, tehát a két oldal ugyanarra a sorra kell hogy jusson.
 * A functions nem látja a libeket, így a képzés itt is le van írva — ha az
 * egyik változik, a másikat vele kell vinni.
 */
export function toVenueSlug(name: string, city: string | null): string {
	const slug = [name, city]
		.filter((part): part is string => !!part?.trim())
		.join(' ')
		.toLowerCase()
		.normalize('NFD')
		// Az akcentus elhagyva, nem átírva: a `Müpa` és a `Mupa` ugyanaz a
		// ház, bárhogy írta is a forrás.
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'venue';
}

/**
 * Amit egy országról (vagy egy városról) kérdezünk.
 *
 * A kérdés a koncerthelyszínekre megy, és a mi típus-szókincsét kéri vissza:
 * amit a modell „music venue"-nak hív, az a `venue` dokumentumban `Venue`
 * vagy `Club`, és ha a válasz már ezt adja, nincs mit utólag találgatni. A
 * hangstúdió, a présüzem és a templom kimarad — ahogy a MusicBrainz-betöltés
 * is kiszűri őket.
 */
export function buildVenuesPrompt(
	countryName: string,
	city: string | null
): string {
	return [
		city
			? `Keresd meg, milyen koncerthelyszínek működnek ${city} városában (${countryName}).`
			: `Keresd meg, milyen koncerthelyszínek működnek ebben az országban: ${countryName}.`,
		'',
		'Azok a helyek kellenek, ahol rendszeresen élő zenei fellépés van:',
		'klub, koncertterem, aréna, stadion, szabadtéri színpad, fesztivál',
		'helyszíne. Hangstúdió, lemezprésüzem, iskola és templom nem kell.',
		'',
		'Használd a keresést, és csak olyan helyet vegyél fel, amit egy konkrét',
		'forrás is kimond (a helyszín saját oldala, jegyértékesítő, a város',
		'programmagazinja). Az URL-eket ne told ki magadtól: csak olyan címet',
		'írj, amit a találatban láttál, és ha nincs ilyen, hagyd null-on.',
		'',
		'Ami bezárt, azt jelöld meg (`closed: true`) — ne hagyd ki, mert akkor',
		'a következő futás újra felhozza, de mi nem vesszük fel.',
		'',
		`A legnagyobb és legismertebb helyekkel kezdd, és legfeljebb ${VENUES_AN_ANSWER}-at`,
		'adj vissza. Ha nem találsz ilyen helyet, adj vissza üres listát — ez is',
		'helyes válasz, ne találj ki helyszínt.',
		'',
		'A válasz csak JSON legyen, séma:',
		'{"venues":[{"name":"a helyszín neve, ahogy helyben hívják",',
		'"city":"a település","address":"az utcai cím vagy null",',
		'"type":"Venue | Club | Stadium | Indoor arena | Concert hall / Theatre',
		' | Amphitheatre | Festival stage | Park",',
		'"closed":true/false,"sourceUrl":"a forrás URL-je",',
		'"confidence":0.0-1.0,"note":"egy sor arról, mi ez a hely"}]}',
	].join('\n');
}

/**
 * Egy ország helyszínei a modelltől, keresésre támaszkodva — a gatewayen át.
 *
 * A keresés miatt nem kérhetünk sémához kötött JSON-t: egyik szolgáltató sem
 * tartja be a kettőt egy hívásban, és a gateway a párost meg is tagadja
 * (`WEB_SEARCH_WITH_SCHEMA`). Ezért a JSON-t a szövegből szedjük ki — a prompt
 * ezt kéri, és ami nem így jön, azt eldobjuk.
 */
export async function askVenueModel(
	client: GatewayClient,
	prompt: string
): Promise<{ venues: ProposedVenue[]; citations: Citation[]; model: string }> {
	const result = await client.execute({
		capability: 'text.complete',
		input: { prompt, webSearch: true, temperature: 0 },
	});

	if (result.kind !== 'result') {
		throw new Error('A gateway a helyszín-kérdést végrehajtásnak vette.');
	}

	// A grounding blokk jelenléte maga a tény, hogy keresés futott. Ha
	// hiányzik, a válasz nem forrásokból készült — ilyet nem teszünk a
	// jóváhagyó elé.
	if (!result.grounding) {
		throw new Error('A gateway keresés nélküli választ adott.');
	}

	return {
		citations: result.grounding.citations.map((citation) => ({
			title: citation.title,
			uri: citation.uri,
		})),
		model: result.model ?? 'ismeretlen',
		venues: parseVenues(result.output?.text ?? ''),
	};
}

/**
 * A JSON a válasz szövegéből. A modell kerítést tesz körbe, bevezető sort ír
 * elé — ezért a legkülső objektumot keressük meg, nem a teljes szöveget
 * olvassuk.
 */
export function parseVenues(text: string): ProposedVenue[] {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');

	if (start < 0 || end <= start) return [];

	try {
		const parsed = JSON.parse(text.slice(start, end + 1)) as {
			venues?: ProposedVenue[];
		};

		return Array.isArray(parsed.venues) ? parsed.venues : [];
	} catch (error) {
		console.warn('A modell válasza nem JSON', error);

		return [];
	}
}

/** A mi típus-szókincsünk; amit nem ismerünk fel, az sima `Venue`. */
export function toVenueType(type: string | null | undefined): string {
	const given = (type ?? '').trim();
	const known = CONCERT_PLACE_TYPES.find(
		(candidate) => candidate.toLowerCase() === given.toLowerCase()
	);

	return known ?? 'Venue';
}

/**
 * Egy javaslat a mi dokumentumunkként, vagy `null`, ha nem vállalható.
 *
 * Amit eldobunk: a név nélküli sort (nincs mit felvenni), és azt, amit a
 * modell maga mond bezártnak — egy bezárt ház nem törzsadat, és a koncertlap
 * amúgy sem kínálná fel.
 */
export function toVenueSuggestionDocument(
	proposal: ProposedVenue,
	countryCode: string,
	model: string,
	now: number,
	sourceUrl: string | null
): (VenueSuggestionDocument & { uid: string }) | null {
	const name = (proposal.name ?? '').trim();

	if (!name || proposal.closed === true) return null;

	const city = (proposal.city ?? '').trim() || null;
	const confidence =
		typeof proposal.confidence === 'number' &&
		proposal.confidence >= 0 &&
		proposal.confidence <= 1
			? proposal.confidence
			: null;

	return {
		active: true,
		address: (proposal.address ?? '').trim() || null,
		city,
		closedAt: null,
		confidence,
		// A koordinátát nem a modelltől vesszük: lásd a fájl fejét.
		coordinates: null,
		countryCode: countryCode.toUpperCase(),
		entityType: ENTITY_TYPE,
		model,
		musicBrainzId: null,
		name,
		note: (proposal.note ?? '').trim() || null,
		reviewState: 'pending',
		reviewedAt: null,
		reviewedBy: null,
		searchParameters: venueSearchParameters(name, city),
		source: 'ai',
		sourceUrl,
		suggestedAt: now,
		type: toVenueType(proposal.type),
		uid: toVenueSlug(name, city),
	};
}

/**
 * Megvan-e már a hely a katalógusban.
 *
 * Nem az azonosítón nézzük, mert az nem ugyanaz a két oldalon: a
 * MusicBrainzről betöltött helyszín azonosítója az mbid, a javaslaté a név
 * slugja. Normalizált néven illesztünk, és a városra is ránézünk — két
 * `Kultúrház` nevű hely két településen nem ugyanaz a ház. Ahol valamelyik
 * oldalon nincs város, ott a név dönt: a `Barba Negra` egy van.
 */
export function isHeldVenue(
	name: string,
	city: string | null,
	venues: VenueDocument[]
): boolean {
	const key = normalize(name);

	if (!key) return false;

	return venues.some((venue) => {
		if (normalize(venue.name) !== key) return false;

		const held = normalize(venue.city);
		const asked = normalize(city);

		return !held || !asked || held === asked;
	});
}

/**
 * Egy futás: egy ország (vagy néhány megnevezett város), kérdésenként egy
 * modellhívás, és ami a válaszból új hely, az a javaslatok közé kerül —
 * `pending` állapotban, soha nem a `venue` alá.
 */
export async function suggestVenues(
	database: Firestore,
	countryCode: string,
	client: GatewayClient,
	options: {
		/** Mely városokat kérdezze; üresen az egész országot, egy kérésben. */
		cities?: string[];
		now?: number;
		/**
		 * A forrás-hivatkozások feloldásához, nem modellhíváshoz: a gateway
		 * átirányítókat ad tovább, és a jóváhagyó a végleges címet nyitja meg.
		 */
		fetchImpl?: typeof fetch;
	} = {}
): Promise<SuggestVenuesResult> {
	const cities = (options.cities ?? [])
		.map((city) => city.trim())
		.filter((city) => !!city);
	const [venueSnapshot, suggestionSnapshot] = await Promise.all([
		database.collection(VENUE_COLLECTION).get(),
		database.collection(VENUE_SUGGESTION_COLLECTION).get(),
	]);
	const venues = venueSnapshot.docs.map(
		(document) =>
			({ ...document.data(), uid: document.id }) as VenueDocument
	);
	const decided = new Map(
		suggestionSnapshot.docs.map((document) => [
			document.id,
			document.get('reviewState') as string,
		])
	);
	// Egy kérdés egy kérés, akkor is, ha nulla hellyel jön vissza. A keretet
	// ezért a hívások ELŐTT vonjuk le, ugyanúgy, mint a koncert-javaslatnál —
	// és onnan jön a „ki van kapcsolva" és az „elfogyott a keret" hiba is.
	const { granted, left } = await reserveRequests(
		database,
		cities.length || 1
	);
	const asked: (string | null)[] = cities.length
		? cities.slice(0, granted)
		: [null];

	// Amit nem használunk fel, azt visszaadjuk: a keret nem fogyhat el amiatt,
	// hogy kevesebb várost kérdeztünk, mint amennyit lefoglaltunk.
	await releaseRequests(database, granted - asked.length);

	const now = options.now ?? Date.now();
	const documents: (VenueSuggestionDocument & { uid: string })[] = [];
	/** Feloldott hivatkozások a futás alatt; egy lap sok helyet említ. */
	const resolved = new Map<string, string | null>();
	/** Amit ez a futás már felvett: két város válasza átlapolhat. */
	const seen = new Set<string>();
	let venuesSeen = 0;
	let duplicates = 0;
	let rejected = 0;
	let discarded = 0;
	let failed = 0;
	let failure: string | null = null;
	let answeringModel = 'ismeretlen';

	for (const city of asked) {
		let answer: {
			venues: ProposedVenue[];
			citations: Citation[];
			model: string;
		};

		try {
			answer = await askVenueModel(
				client,
				buildVenuesPrompt(hungarianCountryName(countryCode), city)
			);
			answeringModel = answer.model;
		} catch (error) {
			// Egy bukott kérés egy várost visz, nem a futást. A keretet már
			// levontuk érte: a kérés elment, fizetni is kell. A kliens viszont
			// megtudja: egy logbejegyzés annak szól, aki a Cloud Console-t
			// nézi, nem annak, aki a gombot nyomta.
			console.warn(
				`A modell ${city ?? countryCode}-ra hibát adott`,
				error
			);
			failed += 1;
			failure ??= error instanceof Error ? error.message : `${error}`;
			continue;
		}

		venuesSeen += answer.venues.length;

		for (const proposal of answer.venues) {
			// Amit a modell forrásként kiírt, azt nem hisszük el: a hozzá
			// tartozó grounding hivatkozást oldjuk fel, és az lesz a link.
			// Futásonként egyszer, mert ugyanaz a lap sok helyet említ.
			const citation = pickCitation(proposal.sourceUrl, answer.citations);
			let source: string | null = null;

			if (citation) {
				if (!resolved.has(citation)) {
					resolved.set(
						citation,
						await resolveSource(citation, options.fetchImpl)
					);
				}

				source = resolved.get(citation) ?? null;
			}

			const document = toVenueSuggestionDocument(
				proposal,
				countryCode,
				answeringModel,
				now,
				source
			);

			if (!document) {
				discarded += 1;
				continue;
			}

			if (seen.has(document.uid)) {
				duplicates += 1;
				continue;
			}

			// Már a katalógusban van: a MusicBrainz-betöltés hozta, vagy az
			// admin vette fel kézzel.
			if (isHeldVenue(document.name, document.city, venues)) {
				duplicates += 1;
				continue;
			}

			const state = decided.get(document.uid);

			// Egyszer már elutasították. Ez a kollekció fő haszna: ugyanazt a
			// rossz helyet nem hozzuk fel újra.
			if (state === 'rejected') {
				rejected += 1;
				continue;
			}

			// Már vár jóváhagyásra egy korábbi futásból. A dokumentumot
			// ilyenkor sem írjuk át: a forrása és a napja az első futásé.
			if (state === 'pending') {
				duplicates += 1;
				continue;
			}

			seen.add(document.uid);
			documents.push(document);
		}
	}

	await writeVenueSuggestions(database, documents);

	return {
		asked: asked.length,
		discarded,
		duplicates,
		failed,
		failure,
		model: answeringModel,
		rejected,
		requestsLeft: left + (granted - asked.length),
		requestsUsed: asked.length,
		suggested: documents.length,
		venuesSeen,
	};
}

/** A kiírás batchekben, minden batch végén a kliens-cache bumpjával. */
async function writeVenueSuggestions(
	database: Firestore,
	documents: (VenueSuggestionDocument & { uid: string })[]
): Promise<void> {
	if (!documents.length) return;

	const collection = database.collection(VENUE_SUGGESTION_COLLECTION);

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
					[VENUE_SUGGESTION_COLLECTION]: FieldValue.serverTimestamp(),
				},
			},
			{ merge: true }
		);

		await batch.commit();
	}
}
