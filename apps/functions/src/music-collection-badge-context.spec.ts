import {
	BadgeAlbum,
	dominantStyles,
	earliestYearOf,
	enamelFromColor,
	titleMotifOf,
} from './music-collection-badge-context';

function album(overrides: Partial<BadgeAlbum> = {}): BadgeAlbum {
	return {
		name: 'Untitled',
		year: 1990,
		styles: ['Thrash'],
		coverUrl: null,
		...overrides,
	};
}

/**
 * A Megadeth stúdiólemezei — az a collection, amelyik kiverte a biztosítékot.
 * A jelvénye lángoló kockát és szakadt pikk ászt kapott, mert a szabály
 * stílust nem mond, az előadó `styles` tömbjében pedig a „Hard rock" állt
 * elöl. Itt a lemezek beszélnek, nem egy tömb sorrendje.
 */
const MEGADETH_ALBUMS = [
	'Killing Is My Business... and Business Is Good!',
	'Peace Sells... but Who’s Buying?',
	'So Far, So Good... So What!',
	'Rust in Peace',
	'Countdown to Extinction',
	'Youthanasia',
	'Cryptic Writings',
	'Risk',
	'The World Needs a Hero',
	'The System Has Failed',
	'United Abominations',
	'Endgame',
	'Super Collider',
	'Dystopia',
	'The Sick, the Dying... and the Dead!',
];

describe('a stílusok többsége', () => {
	it('a leggyakoribb stílust teszi előre, nem az elsőt', () => {
		const styles = dominantStyles(
			[
				album({ styles: ['Hard rock'] }),
				album({ styles: ['Thrash'] }),
				album({ styles: ['Thrash', 'Speed'] }),
			],
			[]
		);

		expect(styles[0]).toBe('Thrash');
	});

	it('egyenlőségnél ábécé szerint dönt, hogy stabil maradjon', () => {
		const first = dominantStyles(
			[album({ styles: ['Thrash'] }), album({ styles: ['Doom'] })],
			[]
		);
		const second = dominantStyles(
			[album({ styles: ['Doom'] }), album({ styles: ['Thrash'] })],
			[]
		);

		expect(first).toEqual(second);
		expect(first[0]).toBe('Doom');
	});

	it('a tartalékot adja vissza, ha egy lemez sem mond stílust', () => {
		expect(
			dominantStyles([album({ styles: [] })], ['Heavy metal'])
		).toEqual(['Heavy metal']);
	});

	it('üres tartalékkal is megáll — a pin ilyenkor az általános motívumé', () => {
		expect(dominantStyles([], [])).toEqual([]);
	});
});

describe('a legkorábbi év', () => {
	it('a lemezekből jön, amikor a szabály nem mond évet', () => {
		expect(
			earliestYearOf([album({ year: 1992 }), album({ year: 1985 })], null)
		).toBe(1985);
	});

	it('a szabály korábbi évét megtartja', () => {
		expect(earliestYearOf([album({ year: 1994 })], 1970)).toBe(1970);
	});

	it('a lemez évét veszi, ha az korábbi a szabályénál', () => {
		expect(earliestYearOf([album({ year: 1983 })], 1990)).toBe(1983);
	});

	it('évszám nélküli lemezekre a szabályra esik vissza', () => {
		expect(earliestYearOf([album({ year: null })], 1990)).toBe(1990);
		expect(earliestYearOf([album({ year: null })], null)).toBeNull();
	});
});

describe('a lemezcímek motívuma', () => {
	it('a Megadeth stúdiólemezeiből a békét emeli ki', () => {
		// A „peace" két címben áll (Peace Sells, Rust in Peace) — ez az, amit
		// erről a lemezsorról a zenekar neve nélkül is tudni lehet.
		expect(titleMotifOf(MEGADETH_ALBUMS, 0)).toBe('a snapped olive branch');
	});

	it('ugyanazt adja a seedtől függetlenül, ha van egyértelmű győztes', () => {
		expect(titleMotifOf(MEGADETH_ALBUMS, 7)).toBe(
			titleMotifOf(MEGADETH_ALBUMS, 0)
		);
	});

	it('egy címen belüli ismétlést egyszer számol', () => {
		// Két „war" egyetlen címben nem ver két külön lemeznyi „wolf"-ot.
		expect(
			titleMotifOf(['War and War Again', 'Wolf', 'Wolf Moon'], 0)
		).toBe('a wolf head in profile');
	});

	it('a rokon szavakat egy tárgyként kezeli', () => {
		// `death` és `skull` ugyanarra a koponyára mutat: a döntetlen nem
		// függhet attól, melyik szinonimát írta a címbe a zenekar.
		expect(titleMotifOf(['Death', 'Skull'], 0)).toBe('a small bare skull');
	});

	it('hallgat, ha egyetlen cím sem mond megönthetőt', () => {
		expect(titleMotifOf(['Risk', 'Endgame', 'Dystopia'], 0)).toBeNull();
	});

	it('üres listán sem dob', () => {
		expect(titleMotifOf([], 0)).toBeNull();
	});
});

describe('a borító zománca', () => {
	it('a vörösből vérvörös zománcot csinál', () => {
		expect(enamelFromColor({ red: 190, green: 30, blue: 30 })).toBe(
			'deep blood red enamel'
		);
	});

	it('a kékből királykéket', () => {
		expect(enamelFromColor({ red: 30, green: 60, blue: 200 })).toBe(
			'royal blue enamel'
		);
	});

	it('a telítetlen sötétet ónszürkének mondja, nem színesnek', () => {
		expect(enamelFromColor({ red: 40, green: 42, blue: 45 })).toBe(
			'gunmetal grey enamel'
		);
	});

	it('a telítetlen világosat csontfehérnek', () => {
		expect(enamelFromColor({ red: 210, green: 208, blue: 205 })).toBe(
			'bone white enamel'
		);
	});

	it('szín nélkül nem talál ki színt', () => {
		expect(enamelFromColor(null)).toBeNull();
	});
});
