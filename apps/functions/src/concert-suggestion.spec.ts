import { VenueDocument } from './concert-venue';
import {
	ProposedConcert,
	askModel,
	buildVenuePrompt,
	chooseVenues,
	hostname,
	pickCitation,
	resolveSource,
	matchCatalogArtists,
	matchVenue,
	parseConcerts,
	sanitizeConcertAiSettings,
	toLineup,
	toSuggestionDocument,
	DEFAULT_CONCERT_AI_SETTINGS,
} from './concert-suggestion';
import { CatalogArtist } from './upcoming-release';

const artist: CatalogArtist = {
	uid: 'artist-tankcsapda',
	name: 'Tankcsapda',
	musicBrainzId: 'mbid-tank',
	imageUrl: 'https://example.test/tank.jpg',
};

const venue = (overrides: Partial<VenueDocument> = {}): VenueDocument => ({
	active: true,
	address: null,
	city: 'Budapest',
	closedAt: null,
	coordinates: null,
	countryCode: 'HU',
	entityType: 'Venue',
	musicBrainzId: 'mbid-park',
	name: 'Budapest Park',
	searchParameters: [],
	source: 'musicbrainz',
	type: 'Venue',
	uid: 'mbid-park',
	...overrides,
});

const window = { from: '2026-10-03', to: '2027-04-01' };

describe('buildVenuePrompt', () => {
	// Egy helyszín, aminek nincs meghirdetett programja, gyakoribb, mint
	// aminek van. Ha a modell nem adhat üres listát, akkor talál ki egyet.
	it('kimondja, hogy az üres lista helyes válasz', () => {
		const prompt = buildVenuePrompt(
			'Barba Negra',
			'Budapest',
			'Magyarország',
			window
		);

		expect(prompt).toContain('üres listát');
		expect(prompt).toContain('ne találj ki');
		expect(prompt).toContain('2026-10-03');
		expect(prompt).toContain('Barba Negra');
		expect(prompt).toContain('Budapest');
		expect(prompt).toContain('sourceUrl');
	});

	// A gyűjtemény zenekara sokszor épp előzenekarként jön el, és egy
	// fesztiválnapon öt ismerős név is lehet.
	it('minden fellépőt kér, nem csak a főfellépőt', () => {
		const prompt = buildVenuePrompt('A38', null, 'Magyarország', window);

		expect(prompt).toContain('Minden fellépőt sorolj fel');
		expect(prompt).toContain('előzenekarok');
		expect(prompt).toContain('"artists"');
	});

	// A polcot nem mondjuk meg neki: attól hajlamos lenne megtalálni.
	it('nem árulja el, mi van a katalógusban', () => {
		const prompt = buildVenuePrompt('A38', null, 'Magyarország', window);

		expect(prompt).not.toContain('katalógus');
		expect(prompt).not.toContain('gyűjtem');
	});
});

describe('parseConcerts', () => {
	it('kibontja a JSON-t a kerítés közül', () => {
		const text =
			'Megnéztem a zenekar oldalát.\n```json\n' +
			'{"concerts":[{"date":"2026-11-12","venue":"Budapest Park"}]}\n```';

		expect(parseConcerts(text)).toEqual([
			{ date: '2026-11-12', venue: 'Budapest Park' },
		]);
	});

	it('értelmezhetetlen válaszra üres listát ad, nem dob', () => {
		expect(parseConcerts('Nem találtam semmit.')).toEqual([]);
		expect(parseConcerts('{csonka')).toEqual([]);
		expect(parseConcerts('')).toEqual([]);
	});

	it('hiányzó `concerts` kulcsra is üres lista', () => {
		expect(parseConcerts('{"valami":1}')).toEqual([]);
	});
});

describe('matchVenue', () => {
	const venues = [
		venue(),
		venue({ uid: 'mbid-a38', musicBrainzId: 'mbid-a38', name: 'A38' }),
		venue({
			uid: 'mbid-kultur-szeged',
			musicBrainzId: 'mbid-kultur-szeged',
			name: 'Kultúrház',
			city: 'Szeged',
		}),
		venue({
			uid: 'mbid-kultur-pecs',
			musicBrainzId: 'mbid-kultur-pecs',
			name: 'Kultúrház',
			city: 'Pécs',
		}),
	];

	it('normalizált névre illeszt', () => {
		expect(matchVenue('budapest park', null, venues)?.uid).toBe('mbid-park');
	});

	// Két azonos nevű hely két településen nem ugyanaz.
	it('azonos nevűeket a városuk dönti el', () => {
		expect(matchVenue('Kultúrház', 'Szeged', venues)?.uid).toBe(
			'mbid-kultur-szeged'
		);
	});

	it('azonos nevűek közül város nélkül nem választ', () => {
		expect(matchVenue('Kultúrház', null, venues)).toBeNull();
	});

	it('ismeretlen helyre null', () => {
		expect(matchVenue('Valahol', 'Budapest', venues)).toBeNull();
	});
});

describe('toLineup', () => {
	const byName = new Map([['tankcsapda', artist]]);

	// A műsor minden zenekara felkerül, de uid-ot csak az kap, akit a katalógus
	// tényleg tart — a lapon ebből lesz link.
	it('a katalógusbeli nevet uid-dal, a többit névként adja', () => {
		expect(toLineup(['TANKCSAPDA', 'Ismeretlen'], byName)).toEqual([
			{
				artistUid: 'artist-tankcsapda',
				imageUrl: 'https://example.test/tank.jpg',
				name: 'TANKCSAPDA',
			},
			{ artistUid: null, imageUrl: null, name: 'Ismeretlen' },
		]);
	});

	it('ugyanazt a zenekart egyszer veszi fel, és az üres nevet elhagyja', () => {
		expect(toLineup(['Tankcsapda', 'tankcsapda', '  '])).toEqual([
			{ artistUid: null, imageUrl: null, name: 'Tankcsapda' },
		]);
	});
});

describe('toSuggestionDocument', () => {
	const proposed = (
		overrides: Partial<ProposedConcert> = {}
	): ProposedConcert => ({
		date: '2026-11-12',
		time: '20:00',
		venue: 'Budapest Park',
		city: 'Budapest',
		title: 'Tankcsapda a Parkban',
		eventType: 'concert',
		sourceUrl: 'https://example.test/tank-park',
		confidence: 0.8,
		note: 'A zenekar oldalán szerepel.',
		...overrides,
	});

	const toDocument = (concert: ProposedConcert) =>
		toSuggestionDocument(
			concert,
			artist,
			[venue()],
			'HU',
			'gemini-2.5-flash',
			window,
			1_760_000_000_000,
			'https://example.test/grounding'
		);

	it('pending állapotban iktatja, soha nem publikálva', () => {
		const document = toDocument(proposed());

		expect(document).toMatchObject({
			reviewState: 'pending',
			reviewedAt: null,
			reviewedBy: null,
			source: 'ai',
			matchedBy: 'name',
			venueUid: 'mbid-park',
			startsAtTime: '20:00',
		});
	});

	it('nap vagy helyszín nélkül nem javasol', () => {
		expect(toDocument(proposed({ date: '2026-11' }))).toBeNull();
		expect(toDocument(proposed({ date: undefined }))).toBeNull();
		expect(toDocument(proposed({ venue: '' }))).toBeNull();
	});

	// A modell szívesen ír a jövő évre; ami kilóg az ablakból, annak nem hiszünk.
	it('az ablakon kívüli napot elutasítja', () => {
		expect(toDocument(proposed({ date: '2028-01-01' }))).toBeNull();
		expect(toDocument(proposed({ date: '2020-01-01' }))).toBeNull();
	});

	it('a 0 és 1 közé szorítja a modell önbizalmát', () => {
		expect(toDocument(proposed({ confidence: 5 }))?.confidence).toBe(1);
		expect(toDocument(proposed({ confidence: -1 }))?.confidence).toBe(0);
		expect(toDocument(proposed({ confidence: null }))?.confidence).toBeNull();
	});

	// Forrás nélkül a javaslat nem ellenőrizhető, ezért legalább a grounding
	// hivatkozása kerüljön rá — az admin azt nyitja meg.
	it('forrás híján a grounding hivatkozását írja be', () => {
		expect(toDocument(proposed({ sourceUrl: null }))?.sourceUrl).toBe(
			'https://example.test/grounding'
		);
	});

	it('ismeretlen helyszínt megtart névként, uid nélkül', () => {
		const document = toDocument(proposed({ venue: 'Valahol Máshol' }));

		expect(document?.venueName).toBe('Valahol Máshol');
		expect(document?.venueUid).toBeNull();
	});

	// Amit a program felsorol, az a javaslattal együtt kerül a helyére: a
	// jóváhagyás csak átemeli, a lap pedig külön-külön írja ki a zenekarokat.
	it('a műsort a katalógussal összevetve írja a javaslatba', () => {
		const document = toSuggestionDocument(
			proposed({ artists: ['Tankcsapda', 'Ismeretlen'] }),
			artist,
			[venue()],
			'HU',
			'gemini-2.5-flash',
			window,
			1_760_000_000_000,
			null,
			new Map([['tankcsapda', artist]])
		);

		expect(document?.lineup).toEqual([
			{
				artistUid: 'artist-tankcsapda',
				imageUrl: 'https://example.test/tank.jpg',
				name: 'Tankcsapda',
			},
			{ artistUid: null, imageUrl: null, name: 'Ismeretlen' },
		]);
	});

	// A MusicBrainz-utat is, a régi javaslatokat is ez fogja meg: névsor
	// nélkül a főfellépő és az előzenekarok adják ki ugyanazt.
	it('névsor nélkül a fellépőből és az előzenekarokból épít műsort', () => {
		const document = toDocument(
			proposed({ supportingActs: ['Első', 'Második'] })
		);

		expect(document?.lineup.map((act) => act.name)).toEqual([
			'Tankcsapda',
			'Első',
			'Második',
		]);
	});

	it('a többnapos fesztivál végét megtartja', () => {
		const document = toDocument(
			proposed({
				date: '2026-11-05',
				endDate: '2026-11-09',
				eventType: 'festival',
			})
		);

		expect(document?.endsAt).toBe('2026-11-09');
		expect(document?.eventType).toBe('festival');
	});

	it('a kezdés előtti végdátumot elhagyja', () => {
		expect(
			toDocument(proposed({ endDate: '2026-11-01' }))?.endsAt
		).toBeNull();
	});
});

describe('chooseVenues', () => {
	const stage = (name: string, type: string | null): VenueDocument =>
		venue({ name, type, uid: name, musicBrainzId: name });
	const roster = [
		stage('Templomkert', 'Religious building'),
		stage('Barba Negra', 'Venue'),
		stage('A38', 'Club'),
		stage('Aréna', 'Indoor arena'),
	];

	// Egy templomkert, egy múzeum vagy egy hangstúdió ritkán ad metal estet;
	// a keret a koncertre való helyeké.
	it('a koncert-helyszíneket veszi előre', () => {
		const chosen = chooseVenues(roster, 0, 3);

		expect(chosen.map((place) => place.name)).toEqual([
			'A38',
			'Aréna',
			'Barba Negra',
		]);
	});

	// Hogy ne ugyanaz a tíz hely kapja el minden nap a keretet.
	it('a kurzortól folytatja, és körbeér', () => {
		const chosen = chooseVenues(roster, 2, 3);

		expect(chosen.map((place) => place.name)).toEqual([
			'Barba Negra',
			'Templomkert',
			'A38',
		]);
	});

	it('a bezárt helyet kihagyja', () => {
		const closed = [...roster, stage('Bezárt', 'Venue')].map((place) =>
			place.name === 'Bezárt' ? { ...place, active: false } : place
		);

		expect(
			chooseVenues(closed, 0, 5).some((place) => place.name === 'Bezárt')
		).toBe(false);
	});
});

describe('matchCatalogArtists', () => {
	const byName = new Map([
		['tankcsapda', artist],
		['ocean', { ...artist, uid: 'artist-ocean', name: 'The Ocean' }],
	]);

	// A program „AMON AMARTH"-ot ír, a katalógus „Amon Amarth"-ot; a névelő és
	// az írásmód nem dönthet arról, hogy észrevesszük-e.
	it('írásmódtól és névelőtől függetlenül illeszt', () => {
		const found = matchCatalogArtists(
			['TANKCSAPDA', 'The Ocean', 'Ismeretlen Zenekar'],
			byName
		);

		expect(found.map((found) => found.uid)).toEqual([
			'artist-tankcsapda',
			'artist-ocean',
		]);
	});

	// Egy rossz párosítás idegen zenekart tenne a gyűjtő lapjára.
	it('a nem egyező nevet nem találja ki', () => {
		expect(matchCatalogArtists(['Tankcsapda Tribute'], byName)).toEqual([]);
	});

	it('ugyanazt a zenekart kétszer nem adja vissza', () => {
		expect(
			matchCatalogArtists(['Tankcsapda', 'tankcsapda'], byName)
		).toHaveLength(1);
	});
});

describe('a forrás, ami tényleg odavezet', () => {
	// A Barba Negra oldala minden útvonalra ugyanazt a lapot adja vissza: a
	// modell kitalált `/events/amon-amarth`-ja szerverről nézve 200, a
	// böngészőben viszont sehova sem visz. Amit a kereső olvasott, az a
	// grounding hivatkozásaiban van.
	it('a modell által említett hoszt hivatkozását választja', () => {
		const citations = [
			{ uri: 'https://redirect.test/egy', title: 'jambase.com' },
			{ uri: 'https://redirect.test/ketto', title: 'barbanegra.hu' },
		];

		expect(
			pickCitation('https://www.barbanegra.hu/events/amon-amarth', citations)
		).toBe('https://redirect.test/ketto');
	});

	it('egyezés híján az elsőt adja, nem a kitalált címet', () => {
		const citations = [{ uri: 'https://redirect.test/egy', title: 'metal.hu' }];

		expect(pickCitation('https://kitalalt.test/est', citations)).toBe(
			'https://redirect.test/egy'
		);
	});

	it('hivatkozás nélkül nincs forrás', () => {
		expect(pickCitation('https://kitalalt.test/est', [])).toBeNull();
	});

	it('a hosztot a www nélkül veti össze', () => {
		expect(hostname('https://www.barbanegra.hu/events')).toBe(
			'barbanegra.hu'
		);
		expect(hostname('nem url')).toBe('');
		expect(hostname(null)).toBe('');
	});

	// A Vertex átirányítói lejárnak, ezért a végleges cím marad meg.
	it('az átirányítót a végleges címre oldja fel', async () => {
		const fetchImpl = (async () => ({
			ok: true,
			url: 'https://www.programturizmus.hu/barba-negra-programok.html',
		})) as never;

		expect(
			await resolveSource('https://vertexaisearch.test/redirect', fetchImpl)
		).toBe('https://www.programturizmus.hu/barba-negra-programok.html');
	});

	it('a döglött hivatkozás nem viszi el a futást', async () => {
		const failing = (async () => {
			throw new Error('ENOTFOUND');
		}) as never;

		expect(
			await resolveSource('https://vertexaisearch.test/redirect', failing)
		).toBeNull();
	});
});

describe('az est azonossága', () => {
	// A program hol a házat írja, hol a színpadát, és egy klub meg a kertje
	// külön hely a listában: a helyszín neve nem dönthet arról, hogy ugyanarról
	// az estéről van-e szó.
	it('ugyanaz a zenekar ugyanazon a napon egy est', () => {
		const night = (document: { artistUid: string; startsAt: string }) =>
			`${document.artistUid}|${document.startsAt}`;

		expect(
			night({ artistUid: 'artist-ocean', startsAt: '2026-11-28' })
		).toBe(night({ artistUid: 'artist-ocean', startsAt: '2026-11-28' }));
		expect(
			night({ artistUid: 'artist-ocean', startsAt: '2026-11-28' })
		).not.toBe(
			night({ artistUid: 'artist-ocean', startsAt: '2026-11-29' })
		);
	});
});

describe('sanitizeConcertAiSettings', () => {
	it('az elírt számot a felső korlátra vágja', () => {
		const settings = sanitizeConcertAiSettings({
			venuesARun: 10_000,
			dailyRequestLimit: 10_000,
		});

		expect(settings.venuesARun).toBe(40);
		expect(settings.dailyRequestLimit).toBe(300);
	});

	it('üres bemenetre az alapértelmezést adja', () => {
		expect(sanitizeConcertAiSettings(undefined)).toEqual(
			DEFAULT_CONCERT_AI_SETTINGS
		);
	});
});

describe('askModel', () => {
	// Grounding nélkül a modell a tanítóadatából írna le jövőbeli koncerteket,
	// ami majdnem biztosan kitalált dátum.
	it('Google-kereséssel kéri a választ', async () => {
		let body: Record<string, unknown> = {};
		const fetchImpl = (async (_url: string, init: { body: string }) => {
			body = JSON.parse(init.body);

			return {
				ok: true,
				status: 200,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: '{"concerts":[{"date":"2026-11-12","venue":"A38"}]}',
									},
								],
							},
							groundingMetadata: {
								groundingChunks: [
									{ web: { uri: 'https://example.test/a' } },
								],
							},
						},
					],
				}),
			};
		}) as unknown as typeof fetch;

		const answer = await askModel(
			DEFAULT_CONCERT_AI_SETTINGS,
			'project-1',
			'kérdés',
			'token',
			fetchImpl
		);

		expect(body['tools']).toEqual([{ googleSearch: {} }]);
		expect(answer.concerts).toHaveLength(1);
		expect(answer.citations).toEqual([
			{ uri: 'https://example.test/a', title: '' },
		]);
	});

	it('a modell hibáját a modell nevével adja tovább', async () => {
		const fetchImpl = (async () => ({
			ok: false,
			status: 404,
			text: async () => 'not found',
		})) as unknown as typeof fetch;

		await expect(
			askModel(
				DEFAULT_CONCERT_AI_SETTINGS,
				'project-1',
				'kérdés',
				'token',
				fetchImpl
			)
		).rejects.toThrow('gemini-2.5-flash');
	});
});

describe('a kikapcsolt alapértelmezés', () => {
	// A grounding kérésenként fizetős, ezért a költés nem indulhat el magától:
	// egy üres mentés sem kapcsolhatja be.
	it('üres mentésből nem lesz bekapcsolt javaslatkérés', () => {
		expect(sanitizeConcertAiSettings({}).enabled).toBe(false);
		expect(sanitizeConcertAiSettings({ model: 'x' }).enabled).toBe(false);
	});

	it('csak a kifejezett igenre kapcsol be', () => {
		expect(sanitizeConcertAiSettings({ enabled: true }).enabled).toBe(true);
		expect(sanitizeConcertAiSettings({ enabled: 'igen' }).enabled).toBe(
			false
		);
	});

	it('az alapértelmezés kikapcsolt és kicsi', () => {
		expect(DEFAULT_CONCERT_AI_SETTINGS.enabled).toBe(false);
		expect(DEFAULT_CONCERT_AI_SETTINGS.dailyRequestLimit).toBeLessThanOrEqual(
			10
		);
	});
});
