import { VenueDocument } from './concert-venue';
import {
	askVenueModel,
	buildVenuesPrompt,
	isHeldVenue,
	parseVenues,
	toVenueSlug,
	toVenueSuggestionDocument,
	toVenueType,
} from './venue-suggestion';

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

describe('buildVenuesPrompt', () => {
	// Egy kitalált klub a katalógus törzsadatába kerülne, és minden est arra
	// hivatkozna — ezért a kérdés kimondja, hogy az üres lista is válasz.
	it('kimondja, hogy az üres lista helyes válasz', () => {
		const prompt = buildVenuesPrompt('Ausztria', null);

		expect(prompt).toContain('üres listát');
		expect(prompt).toContain('ne találj ki');
		expect(prompt).toContain('Ausztria');
		expect(prompt).toContain('sourceUrl');
	});

	// Városra szűkítve egy ország mélyebben is bejárható, mint a fővárosa.
	it('a megnevezett várost kérdezi, ha van', () => {
		const prompt = buildVenuesPrompt('Ausztria', 'Graz');

		expect(prompt).toContain('Graz');
		expect(prompt).toContain('Ausztria');
	});

	// A 249 magyar helyből 81 hangstúdió volt: a típus-szűrés a MusicBrainz
	// betöltésnél is ez, és a modellnek is ezt mondjuk meg.
	it('kizárja azt, ami nem koncerthelyszín', () => {
		const prompt = buildVenuesPrompt('Ausztria', null);

		expect(prompt).toContain('Hangstúdió');
		expect(prompt).toContain('Festival stage');
	});
});

describe('parseVenues', () => {
	it('kibontja a JSON-t a kerítés közül', () => {
		const text =
			'Megnéztem a város programmagazinját.\n```json\n' +
			'{"venues":[{"name":"Arena Wien","city":"Wien"}]}\n```';

		expect(parseVenues(text)).toEqual([
			{ name: 'Arena Wien', city: 'Wien' },
		]);
	});

	it('üres listát ad, ha a válasz nem JSON', () => {
		expect(parseVenues('Nem találtam ilyet.')).toEqual([]);
	});
});

describe('toVenueType', () => {
	it('a mi szókincsünkre állítja a típust', () => {
		expect(toVenueType('club')).toBe('Club');
		expect(toVenueType('Festival stage')).toBe('Festival stage');
	});

	// Amit nem ismerünk fel, az sima helyszín — a koncertlap ezt kínálja.
	it('az ismeretlen típusból Venue lesz', () => {
		expect(toVenueType('Beer garden')).toBe('Venue');
		expect(toVenueType(null)).toBe('Venue');
	});
});

describe('toVenueSlug', () => {
	// Ugyanaz a ház, bárhogy írta is a forrás: az akcentus elhagyva.
	it('ugyanarra a slugra viszi az akcentust', () => {
		expect(toVenueSlug('Müpa', 'Budapest')).toBe('mupa-budapest');
		expect(toVenueSlug('Mupa', 'Budapest')).toBe('mupa-budapest');
	});

	it('elvan város nélkül is', () => {
		expect(toVenueSlug('A38', null)).toBe('a38');
	});
});

describe('toVenueSuggestionDocument', () => {
	it('javaslatot csinál a modell soraiból', () => {
		const document = toVenueSuggestionDocument(
			{
				name: ' Arena Wien ',
				city: 'Wien',
				address: 'Baumgasse 80',
				type: 'Club',
				confidence: 0.8,
				note: 'Nagy klub a Duna-csatorna mellett.',
			},
			'at',
			'gemini-2.5-flash',
			1_760_000_000_000,
			'https://arena.wien/'
		);

		expect(document).toMatchObject({
			active: true,
			address: 'Baumgasse 80',
			city: 'Wien',
			confidence: 0.8,
			countryCode: 'AT',
			model: 'gemini-2.5-flash',
			name: 'Arena Wien',
			reviewState: 'pending',
			reviewedAt: null,
			source: 'ai',
			sourceUrl: 'https://arena.wien/',
			type: 'Club',
			uid: 'arena-wien-wien',
		});
	});

	// A cím és a város egy pillantással ellenőrizhető, a koordináta nem: egy
	// kitalált szám a térképen egy mezőre tenné a klubot.
	it('nem vesz át koordinátát a modelltől', () => {
		const document = toVenueSuggestionDocument(
			{ name: 'Arena Wien', city: 'Wien' },
			'AT',
			'modell',
			1,
			null
		);

		expect(document?.coordinates).toBeNull();
		expect(document?.musicBrainzId).toBeNull();
	});

	it('eldobja a nevet nem adó sort és a bezárt helyet', () => {
		expect(
			toVenueSuggestionDocument({ city: 'Wien' }, 'AT', 'modell', 1, null)
		).toBeNull();
		expect(
			toVenueSuggestionDocument(
				{ name: 'Flex', closed: true },
				'AT',
				'modell',
				1,
				null
			)
		).toBeNull();
	});

	// A 0-1 skálán kívüli szám nem bizonyosság, hanem zaj; a lista rendezése
	// épül rá.
	it('elhagyja a skálán kívüli bizonyosságot', () => {
		const document = toVenueSuggestionDocument(
			{ name: 'Flex', confidence: 12 },
			'AT',
			'modell',
			1,
			null
		);

		expect(document?.confidence).toBeNull();
	});
});

describe('isHeldVenue', () => {
	// A MusicBrainzről betöltött helyszín azonosítója az mbid, a javaslaté a
	// név slugja: azonosítón nézve minden javaslat újnak tűnne.
	it('felismeri a már betöltött helyet a nevéről', () => {
		expect(isHeldVenue('budapest park', 'Budapest', [venue()])).toBe(true);
	});

	it('nem veszi egynek a két város ugyanazon nevű házát', () => {
		const held = [venue({ city: 'Szeged', name: 'Kultúrház' })];

		expect(isHeldVenue('Kultúrház', 'Pécs', held)).toBe(false);
	});

	// Ahol valamelyik oldalon nincs város, ott a név dönt: egy A38 van.
	it('város nélkül a névre hagyatkozik', () => {
		const held = [venue({ city: null, name: 'A38' })];

		expect(isHeldVenue('A38', 'Budapest', held)).toBe(true);
	});

	it('az új helyet nem hiszi megvoltnak', () => {
		expect(isHeldVenue('Arena Wien', 'Wien', [venue()])).toBe(false);
	});
});

describe('askVenueModel', () => {
	/** A gateway kliensének az a fele, amit ez a hívás használ. */
	const clientReturning = (result: Record<string, unknown>) =>
		({ execute: async () => result }) as never;

	// Keresés nélkül a modell a tanítóadatából sorolna fel klubokat, amiből
	// egy része évek óta nem létezik.
	it('keresésre támaszkodva kéri a választ', async () => {
		let sent: Record<string, unknown> = {};
		const client = {
			execute: async (request: Record<string, unknown>) => {
				sent = request;

				return {
					kind: 'result',
					model: 'gemini-2.5-flash',
					output: { text: '{"venues":[{"name":"Flex"}]}' },
					grounding: {
						citations: [
							{ uri: 'https://example.test/a', title: '' },
						],
					},
				};
			},
		} as never;

		const answer = await askVenueModel(client, 'kérdés');

		expect(
			(sent['input'] as Record<string, unknown> | undefined)?.[
				'webSearch'
			]
		).toBe(true);
		expect(sent['capability']).toBe('text.complete');
		expect(answer.venues).toHaveLength(1);
		expect(answer.model).toBe('gemini-2.5-flash');
	});

	it('elutasítja a keresés nélkül készült választ', async () => {
		const client = clientReturning({
			kind: 'result',
			model: 'gemini-2.5-flash',
			output: { text: '{"venues":[]}' },
		});

		await expect(askVenueModel(client, 'kérdés')).rejects.toThrow(
			'keresés nélküli'
		);
	});

	it('elutasítja, ha a gateway végrehajtásnak vette a kérést', async () => {
		const client = clientReturning({ kind: 'accepted', executionId: 'x' });

		await expect(askVenueModel(client, 'kérdés')).rejects.toThrow(
			'végrehajtásnak'
		);
	});
});
