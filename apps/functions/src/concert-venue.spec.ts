import {
	MusicBrainzPlace,
	isConcertPlace,
	resolveCountryArea,
	toVenueDocument,
	venueSearchParameters,
} from './concert-venue';

const place = (overrides: Partial<MusicBrainzPlace> = {}): MusicBrainzPlace => ({
	id: 'place-1',
	name: 'Budapest Park',
	type: 'Venue',
	address: 'Budapest, Soroksári út 60, 1095',
	coordinates: { latitude: '47.4654', longitude: '19.0754' },
	area: { id: 'area-budapest', name: 'Budapest' },
	...overrides,
});

describe('isConcertPlace', () => {
	it('elfogadja azokat a típusokat, ahol fellépés zajlik', () => {
		for (const type of [
			'Venue',
			'Stadium',
			'Club',
			'Indoor arena',
			'Concert hall / Theatre',
			'Festival stage',
		]) {
			expect(isConcertPlace(place({ type }))).toBe(true);
		}
	});

	it('kihagyja a stúdiót, a présüzemet és az iskolát', () => {
		for (const type of [
			'Studio',
			'Pressing plant',
			'Educational institution',
		]) {
			expect(isConcertPlace(place({ type }))).toBe(false);
		}
	});

	// Huszonhárom magyar helynek nincs típusa. Nem tudni, melyik koncerthelyszín
	// közülük, ezért a betöltés kihagyja őket — amelyikben tényleg játszanak,
	// azt a koncertbetöltés veszi fel, mert ott az esemény a bizonyíték.
	it('kihagyja a típus nélküli helyet', () => {
		expect(isConcertPlace(place({ type: null }))).toBe(false);
		expect(isConcertPlace(place({ type: undefined }))).toBe(false);
	});
});

describe('toVenueDocument', () => {
	it('a koordinátát számmá olvassa, nem szövegként hagyja', () => {
		const document = toVenueDocument(place(), 'HU');

		expect(document.coordinates).toEqual({
			latitude: 47.4654,
			longitude: 19.0754,
		});
	});

	it('koordináta nélküli helyre null-t ad, nem NaN-t', () => {
		const document = toVenueDocument(place({ coordinates: null }), 'HU');

		expect(document.coordinates).toBeNull();
	});

	// Az országra böngészve az area hol a város, hol maga az ország. Az
	// ország városként beírva a szűrőben külön „Hungary" tételt csinálna.
	it('az ország nevét nem írja be városként', () => {
		const document = toVenueDocument(
			place({ area: { id: 'area-hu', name: 'Hungary' } }),
			'HU'
		);

		expect(document.city).toBeNull();
	});

	it('a bezárt helyet visszavonja, de megtartja', () => {
		const document = toVenueDocument(
			place({ 'life-span': { end: '2019-12-31' } }),
			'HU'
		);

		expect(document.closedAt).toBe('2019-12-31');
		expect(document.active).toBe(false);
	});

	it('a dokumentum azonosítója a MusicBrainz id', () => {
		const document = toVenueDocument(place({ id: 'mbid-42' }), 'HU');

		expect(document.uid).toBe('mbid-42');
		expect(document.musicBrainzId).toBe('mbid-42');
		expect(document.source).toBe('musicbrainz');
	});
});

describe('venueSearchParameters', () => {
	it('ékezet nélküli szavakat ad, a rövideket elhagyva', () => {
		expect(venueSearchParameters('Müpa Budapest', 'Budapest')).toEqual([
			'mupa',
			'budapest',
		]);
	});
});

describe('resolveCountryArea', () => {
	it('az `iso1` mezővel kérdez, mert a dokumentált név nem indexelt', async () => {
		const urls: string[] = [];
		const fetchImpl = (async (url: string) => {
			urls.push(url);

			return {
				ok: true,
				status: 200,
				json: async () => ({
					areas: [{ id: 'area-hu', name: 'Hungary' }],
				}),
			};
		}) as never;

		const area = await resolveCountryArea('hu', {
			fetchImpl,
			intervalMs: 0,
		});

		expect(area).toBe('area-hu');
		expect(urls[0]).toContain('iso1%3AHU');
	});

	it('ismeretlen országra hibát ad, nem csendben üres listát', async () => {
		const fetchImpl = (async () => ({
			ok: true,
			status: 200,
			json: async () => ({ areas: [] }),
		})) as never;

		await expect(
			resolveCountryArea('ZZ', { fetchImpl, intervalMs: 0 })
		).rejects.toThrow('ZZ');
	});
});
