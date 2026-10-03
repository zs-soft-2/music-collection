import {
	ConcertEntity,
	EntityTypeEnum,
	VenueEntity,
} from '@music-collection/api';

import {
	toCities,
	toConcertView,
	toCountdown,
	toCountdownValue,
	toMonths,
} from './concert.mapper';

const concert = (overrides: Partial<ConcertEntity> = {}): ConcertEntity => ({
	artistImageUrl: null,
	artistName: 'Tankcsapda',
	artistUid: 'artist-tank',
	cancelled: false,
	city: 'Budapest',
	countryCode: 'HU',
	endsAt: null,
	entityType: EntityTypeEnum.Concert,
	eventType: 'concert',
	matchedBy: 'musicBrainzId',
	musicBrainzArtistIds: [],
	musicBrainzEventId: 'mbid-event',
	source: 'musicbrainz',
	sourceUrl: null,
	startsAt: '2026-11-12',
	startsAtTime: '20:00',
	supportingActs: [],
	ticketUrl: null,
	title: 'Tankcsapda a Parkban',
	uid: 'concert-1',
	venueName: 'Budapest Park',
	venueUid: 'mbid-park',
	...overrides,
});

const venue = (overrides: Partial<VenueEntity> = {}): VenueEntity => ({
	active: true,
	address: 'Budapest, Soroksári út 60',
	city: 'Budapest',
	closedAt: null,
	coordinates: null,
	countryCode: 'HU',
	entityType: EntityTypeEnum.Venue,
	musicBrainzId: 'mbid-park',
	name: 'Budapest Park',
	source: 'musicbrainz',
	type: 'Venue',
	uid: 'mbid-park',
	...overrides,
});

describe('toConcertView', () => {
	// A helyszín-dokumentum pontosabb, mint amit a forrás a koncertbe írt: a
	// címet és a város javított alakját onnan vesszük.
	it('a helyszínből veszi a címet és a várost', () => {
		const view = toConcertView(
			concert({ city: 'budapest' }),
			venue({ city: 'Budapest' })
		);

		expect(view.city).toBe('Budapest');
		expect(view.venueAddress).toBe('Budapest, Soroksári út 60');
		expect(view.venueUrl).toBe('https://musicbrainz.org/place/mbid-park');
	});

	it('helyszín-dokumentum nélkül a koncert saját adatán áll', () => {
		const view = toConcertView(concert(), null);

		expect(view.city).toBe('Budapest');
		expect(view.venueName).toBe('Budapest Park');
		expect(view.venueUrl).toBeNull();
	});

	// Amit a javaslat jóváhagyásakor kiírtunk: minden fellépő külön, és ami a
	// katalógusban megvan, az uid-del — azt a lap linkké teszi.
	it('a koncerttel kiírt névsort adja, a katalógus-találatokkal', () => {
		const view = toConcertView(
			concert({
				lineup: [
					{
						artistUid: 'artist-tank',
						imageUrl: null,
						name: 'Tankcsapda',
					},
					{ artistUid: null, imageUrl: null, name: 'Első' },
				],
			}),
			null
		);

		expect(view.lineup).toEqual([
			{ artistUid: 'artist-tank', name: 'Tankcsapda' },
			{ artistUid: null, name: 'Első' },
		]);
	});

	// A mező előtt iktatott esték: a nevek megvannak, a párosítás nincs meg —
	// a fellépők névként jelennek meg, a főfellépő linkkel.
	it('névsor nélkül a fellépő és az előzenekarok adják a műsort', () => {
		const view = toConcertView(
			concert({ supportingActs: ['Első', 'Második'] }),
			null
		);

		expect(view.lineup).toEqual([
			{ artistUid: 'artist-tank', name: 'Tankcsapda' },
			{ artistUid: null, name: 'Első' },
			{ artistUid: null, name: 'Második' },
		]);
	});

	// A hét zenekaros est címe maga a névsor. Kiírva háromszor szerepelne
	// ugyanaz: a fellépő sorában, a címben és a műsorban.
	it('a névsort ismétlő címet a fellépő nevére cseréli', () => {
		const view = toConcertView(
			concert({
				title: 'Tankcsapda | Első | Második',
				supportingActs: ['Első', 'Második'],
			}),
			null
		);

		expect(view.title).toBe('Tankcsapda');
		expect(view.titleIsArtist).toBe(true);
	});

	it('a saját nevét viselő estet egyszer írja ki', () => {
		const view = toConcertView(concert({ title: 'Tankcsapda' }), null);

		expect(view.titleIsArtist).toBe(true);
	});

	it('a nevet nem ismétlő cím megmarad', () => {
		const view = toConcertView(concert(), null);

		expect(view.title).toBe('Tankcsapda a Parkban');
		expect(view.titleIsArtist).toBe(false);
	});
});

describe('toCountdown', () => {
	it('a ma és a holnap saját mondatot kap', () => {
		expect(toCountdown('2026-10-03', '2026-10-03')).toBe(
			'page.concert.countdown.today'
		);
		expect(toCountdown('2026-10-04', '2026-10-03')).toBe(
			'page.concert.countdown.tomorrow'
		);
	});

	it('egy héten belül napokat, azon túl heteket számol', () => {
		expect(toCountdown('2026-10-06', '2026-10-03')).toBe(
			'page.concert.countdown.days'
		);
		expect(toCountdownValue('2026-10-06', '2026-10-03')).toBe(3);
		expect(toCountdown('2026-10-20', '2026-10-03')).toBe(
			'page.concert.countdown.weeks'
		);
		expect(toCountdownValue('2026-10-20', '2026-10-03')).toBe(2);
	});

	// A ma és a holnap mondata nem nevez számot; a sablonnak null kell, hogy
	// ne írjon ki üres helyőrzőt.
	it('a számot elhagyja, ahol a mondat nem nevez meg egyet', () => {
		expect(toCountdownValue('2026-10-03', '2026-10-03')).toBeNull();
		expect(toCountdownValue('2026-10-04', '2026-10-03')).toBeNull();
	});
});

describe('toMonths', () => {
	// Az egy napra eső esték egy sorba kerülnek, az üres napok kimaradnak: egy
	// hónap üres sor elrejtené azt a hármat, ami számít.
	it('hónapokba és napokba csoportosít, üres nap nélkül', () => {
		const months = toMonths(
			[
				{ concert: concert({ uid: 'a', startsAt: '2026-11-12' }), venue: null },
				{
					concert: concert({
						uid: 'b',
						startsAt: '2026-11-12',
						artistName: 'Másik',
					}),
					venue: null,
				},
				{ concert: concert({ uid: 'c', startsAt: '2026-12-02' }), venue: null },
			],
			'2026-11-01'
		);

		expect(months).toHaveLength(2);
		expect(months[0].days).toHaveLength(1);
		expect(months[0].days[0].concerts).toHaveLength(2);
		expect(months[0].days[0].day).toBe('12');
		expect(months[1].days[0].day).toBe('2');
	});

	it('üres listára üres idővonal', () => {
		expect(toMonths([], '2026-11-01')).toEqual([]);
	});
});

describe('toCities', () => {
	it('csak azokat a városokat adja, ahol van koncert — egyszer', () => {
		const cities = toCities([
			{ concert: concert({ city: 'Budapest' }), venue: null },
			{ concert: concert({ city: 'Budapest' }), venue: null },
			{ concert: concert({ city: 'Szeged' }), venue: null },
			{ concert: concert({ city: null }), venue: null },
		]);

		expect(cities).toEqual(['Budapest', 'Szeged']);
	});
});
