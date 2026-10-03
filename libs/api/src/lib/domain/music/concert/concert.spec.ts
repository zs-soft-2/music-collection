import { Concert, toConcertLineup } from './concert';

const concert = (overrides: Partial<Concert> = {}): Concert =>
	({
		artistImageUrl: 'https://example.test/tank.jpg',
		artistName: 'Tankcsapda',
		artistUid: 'artist-tank',
		supportingActs: [],
		...overrides,
	}) as Concert;

describe('toConcertLineup', () => {
	// A párosított névsor a koncerttel együtt íródott ki, a katalógus
	// ismeretében; itt nincs mit számolni rajta.
	it('a koncerttel kiírt műsort adja vissza érintetlenül', () => {
		const lineup = [
			{ artistUid: 'artist-tank', imageUrl: null, name: 'Tankcsapda' },
			{ artistUid: null, imageUrl: null, name: 'Első' },
		];

		expect(toConcertLineup(concert({ lineup }))).toBe(lineup);
	});

	// A mező előtt iktatott esték. A nevek megvannak, a párosítás nincs: a
	// fellépőket a backfill script és a javaslatok kötik a katalógushoz.
	it('műsor nélkül a fellépő áll elöl, utána az előzenekarok', () => {
		expect(
			toConcertLineup(concert({ supportingActs: ['Első', 'Második'] }))
		).toEqual([
			{
				artistUid: 'artist-tank',
				imageUrl: 'https://example.test/tank.jpg',
				name: 'Tankcsapda',
			},
			{ artistUid: null, imageUrl: null, name: 'Első' },
			{ artistUid: null, imageUrl: null, name: 'Második' },
		]);
	});

	// A javaslat előzenekar-listája a megkérdezett helyszín teljes műsora, a
	// főfellépővel együtt is érkezhet.
	it('a fellépőt nem írja ki kétszer, és az üres nevet elhagyja', () => {
		expect(
			toConcertLineup(
				concert({ supportingActs: ['tankcsapda', '  ', 'Első'] })
			).map((act) => act.name)
		).toEqual(['Tankcsapda', 'Első']);
	});
});
