import { VenueDocument } from './concert-venue';
import {
	MusicBrainzSearchEvent,
	concertWindow,
	fetchEventsForArtists,
	heldAt,
	performers,
	toConcertDocuments,
	toConcertId,
	toEventType,
} from './concert-event';
import { CatalogArtist } from './upcoming-release';

const artists: CatalogArtist[] = [
	{
		uid: 'artist-tankcsapda',
		name: 'Tankcsapda',
		musicBrainzId: 'mbid-tank',
		imageUrl: 'https://example.test/tank.jpg',
	},
	{
		uid: 'artist-no-mbid',
		name: 'Nincs Azonosító',
		musicBrainzId: null,
		imageUrl: null,
	},
];

const byMusicBrainzId = new Map(
	artists
		.filter((artist) => !!artist.musicBrainzId)
		.map((artist) => [artist.musicBrainzId as string, artist])
);

const venue: VenueDocument = {
	active: true,
	address: 'Budapest, Soroksári út 60',
	city: 'Budapest',
	closedAt: null,
	coordinates: { latitude: 47.4654, longitude: 19.0754 },
	countryCode: 'HU',
	entityType: 'Venue',
	musicBrainzId: 'mbid-park',
	name: 'Budapest Park',
	searchParameters: ['budapest', 'park'],
	source: 'musicbrainz',
	type: 'Venue',
	uid: 'mbid-park',
};

const venues = new Map([[venue.musicBrainzId as string, venue]]);

const event = (
	overrides: Partial<MusicBrainzSearchEvent> = {}
): MusicBrainzSearchEvent => ({
	id: 'event-1',
	name: 'Tankcsapda a Budapest Parkban',
	type: 'Concert',
	time: '20:00',
	cancelled: false,
	'life-span': { begin: '2026-11-12', end: '2026-11-12' },
	relations: [
		{
			type: 'main performer',
			artist: { id: 'mbid-tank', name: 'Tankcsapda' },
		},
		{ type: 'held at', place: { id: 'mbid-park', name: 'Budapest Park' } },
	],
	...overrides,
});

describe('concertWindow', () => {
	it('ma és a következő n nap', () => {
		expect(concertWindow(new Date('2026-10-03T08:00:00Z'), 180)).toEqual({
			from: '2026-10-03',
			to: '2027-04-01',
		});
	});
});

describe('toConcertId', () => {
	// Mindkét betöltés újra és újra lefut; véletlen azonosítóval ugyanaz az
	// este többször is beíródna.
	it('ugyanarra az estére ugyanazt az azonosítót adja', () => {
		expect(toConcertId('artist-1', '2026-11-12', 'Budapest Park')).toBe(
			toConcertId('artist-1', '2026-11-12', 'Budapest Park')
		);
	});

	it('az ékezetet és a szóközt is lekezeli', () => {
		expect(toConcertId('a', '2026-11-12', 'Müpa — Nagyterem')).toBe(
			'a_2026-11-12_mupa-nagyterem'
		);
	});
});

describe('performers és heldAt', () => {
	it('a főszereplő áll az élen', () => {
		const credited = performers(
			event({
				relations: [
					{ type: 'support', artist: { id: 'mbid-x', name: 'Előzenekar' } },
					{
						type: 'main performer',
						artist: { id: 'mbid-tank', name: 'Tankcsapda' },
					},
				],
			})
		);

		expect(credited[0].name).toBe('Tankcsapda');
	});

	it('a helyszínt a kapcsolatból olvassa', () => {
		expect(heldAt(event())).toEqual({
			id: 'mbid-park',
			name: 'Budapest Park',
		});
	});

	it('helyszín nélküli eseményre null', () => {
		expect(heldAt(event({ relations: [] }))).toBeNull();
	});
});

describe('toEventType', () => {
	it('koncert, fesztivál, minden más', () => {
		expect(toEventType('Concert')).toBe('concert');
		expect(toEventType('Festival')).toBe('festival');
		expect(toEventType('Convention/Expo')).toBe('other');
		expect(toEventType(null)).toBe('other');
	});
});

describe('toConcertDocuments', () => {
	it('a katalógus előadójának estjét iktatja', () => {
		const [document] = toConcertDocuments(event(), byMusicBrainzId, venues);

		expect(document).toMatchObject({
			artistUid: 'artist-tankcsapda',
			city: 'Budapest',
			countryCode: 'HU',
			matchedBy: 'musicBrainzId',
			source: 'musicbrainz',
			startsAt: '2026-11-12',
			startsAtTime: '20:00',
			venueUid: 'mbid-park',
		});
	});

	// Részleges dátumra (2026 vagy 2026-11) a lap nem tud idővonalat rajzolni,
	// és a lejárat-söprés sem működne.
	it('részleges dátumot nem fogad el', () => {
		for (const begin of ['2026', '2026-11', '', null]) {
			expect(
				toConcertDocuments(
					event({ 'life-span': { begin } }),
					byMusicBrainzId,
					venues
				)
			).toEqual([]);
		}
	});

	// A betöltött helyszínlista egyben országszűrő: ami nincs rajta, az nem
	// ennek az országnak a helye.
	it('ismeretlen helyszínre nem iktat', () => {
		expect(
			toConcertDocuments(
				event({
					relations: [
						{
							type: 'main performer',
							artist: { id: 'mbid-tank', name: 'Tankcsapda' },
						},
						{
							type: 'held at',
							place: { id: 'mbid-ismeretlen', name: 'Valahol' },
						},
					],
				}),
				byMusicBrainzId,
				venues
			)
		).toEqual([]);
	});

	it('idegen előadó estjét nem iktatja', () => {
		expect(
			toConcertDocuments(
				event({
					relations: [
						{
							type: 'main performer',
							artist: { id: 'mbid-masik', name: 'Másik Zenekar' },
						},
						{
							type: 'held at',
							place: { id: 'mbid-park', name: 'Budapest Park' },
						},
					],
				}),
				byMusicBrainzId,
				venues
			)
		).toEqual([]);
	});

	it('a többnapos fesztivál végét megtartja, az egynaposét nem', () => {
		const [festival] = toConcertDocuments(
			event({
				type: 'Festival',
				'life-span': { begin: '2026-08-05', end: '2026-08-09' },
			}),
			byMusicBrainzId,
			venues
		);
		const [night] = toConcertDocuments(event(), byMusicBrainzId, venues);

		expect(festival.endsAt).toBe('2026-08-09');
		expect(festival.eventType).toBe('festival');
		expect(night.endsAt).toBeNull();
	});

	it('az előzenekarokat külön listázza', () => {
		const [document] = toConcertDocuments(
			event({
				relations: [
					{
						type: 'main performer',
						artist: { id: 'mbid-tank', name: 'Tankcsapda' },
					},
					{
						type: 'support',
						artist: { id: 'mbid-x', name: 'Előzenekar' },
					},
					{
						type: 'held at',
						place: { id: 'mbid-park', name: 'Budapest Park' },
					},
				],
			}),
			byMusicBrainzId,
			venues
		);

		expect(document.supportingActs).toEqual(['Előzenekar']);
	});

	// Egy fesztiválon több ismerős zenekar is fellép, és mindegyiket a maga
	// előadójának a lapján keresi az, akit érdekel.
	it('minden katalógusbeli fellépőre külön estet iktat', () => {
		const quimby: CatalogArtist = {
			uid: 'artist-quimby',
			name: 'Quimby',
			musicBrainzId: 'mbid-quimby',
			imageUrl: null,
		};
		const documents = toConcertDocuments(
			event({
				type: 'Festival',
				name: 'Fesztivál 2026',
				relations: [
					{
						type: 'main performer',
						artist: { id: 'mbid-tank', name: 'Tankcsapda' },
					},
					{
						type: 'main performer',
						artist: { id: 'mbid-quimby', name: 'Quimby' },
					},
					{
						type: 'support',
						artist: { id: 'mbid-x', name: 'Előzenekar' },
					},
					{
						type: 'held at',
						place: { id: 'mbid-park', name: 'Budapest Park' },
					},
				],
			}),
			new Map([...byMusicBrainzId, ['mbid-quimby', quimby]]),
			venues
		);

		expect(documents.map((document) => document.artistUid)).toEqual([
			'artist-tankcsapda',
			'artist-quimby',
		]);
		// Egymás mellett lépnek fel: a másik mindkét estnél ott a műsorban.
		expect(documents[0].supportingActs).toEqual(['Quimby', 'Előzenekar']);
		expect(documents[1].supportingActs).toEqual([
			'Tankcsapda',
			'Előzenekar',
		]);
		// A műsor mbid-en párosítva: a két ismerős zenekar uid-dal, a harmadik
		// névként. A lap ebből linkeli a nevet, ezért nem találgatunk.
		expect(documents[0].lineup).toEqual([
			{
				artistUid: 'artist-tankcsapda',
				imageUrl: 'https://example.test/tank.jpg',
				name: 'Tankcsapda',
			},
			{ artistUid: 'artist-quimby', imageUrl: null, name: 'Quimby' },
			{ artistUid: null, imageUrl: null, name: 'Előzenekar' },
		]);
		expect(documents[1].lineup).toEqual(documents[0].lineup);
	});

	// Ugyanaz a zenekar két kapcsolattal is szerepelhet az eseményen; attól
	// még egy est.
	it('ugyanazt a zenekart kétszer nem iktatja', () => {
		const documents = toConcertDocuments(
			event({
				relations: [
					{
						type: 'main performer',
						artist: { id: 'mbid-tank', name: 'Tankcsapda' },
					},
					{
						type: 'support',
						artist: { id: 'mbid-tank', name: 'Tankcsapda' },
					},
					{
						type: 'held at',
						place: { id: 'mbid-park', name: 'Budapest Park' },
					},
				],
			}),
			byMusicBrainzId,
			venues
		);

		expect(documents).toHaveLength(1);
	});

	it('a lemondott estet megtartja, de megjelöli', () => {
		const [document] = toConcertDocuments(
			event({ cancelled: true }),
			byMusicBrainzId,
			venues
		);

		expect(document.cancelled).toBe(true);
	});
});

describe('fetchEventsForArtists', () => {
	it('csak azonosítóval rendelkező előadókat kérdez, kötegelve', async () => {
		const queries: string[] = [];
		const fetchImpl = (async (url: string) => {
			queries.push(url);

			return {
				ok: true,
				status: 200,
				json: async () => ({ count: 1, events: [event()] }),
			};
		}) as never;

		const events = await fetchEventsForArtists(
			artists,
			{ from: '2026-10-03', to: '2027-04-01' },
			{ fetchImpl, intervalMs: 0 }
		);

		expect(events).toHaveLength(1);
		expect(queries).toHaveLength(1);
		expect(queries[0]).toContain('arid');
		expect(queries[0]).toContain('mbid-tank');
		// A MusicBrainz event-keresésben az `aid` az area azonosítója, az
		// előadóé az `arid`; a kettő felcserélve csendben nulla találatot ad.
		expect(queries[0]).not.toContain('aid%3Ambid');
		expect(queries[0]).toContain('begin');
	});

	it('azonosító nélküli katalógussal egy kérést sem indít', async () => {
		const fetchImpl = jest.fn();

		const events = await fetchEventsForArtists(
			[artists[1]],
			{ from: '2026-10-03', to: '2027-04-01' },
			{ fetchImpl: fetchImpl as never, intervalMs: 0 }
		);

		expect(events).toEqual([]);
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
