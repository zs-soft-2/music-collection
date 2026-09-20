import {
	duplicateCatalogNames,
	isSameCatalogName,
	normalizeCatalogName,
	stripDiscogsSuffix,
} from './catalog-name';

describe('stripDiscogsSuffix', () => {
	it('drops the number Discogs uses to tell same-named acts apart', () => {
		expect(stripDiscogsSuffix('Testament (2)')).toBe('Testament');
	});

	it('keeps a number that is part of the name', () => {
		expect(stripDiscogsSuffix('Sum 41')).toBe('Sum 41');
		expect(stripDiscogsSuffix('Blink-182')).toBe('Blink-182');
	});
});

describe('isSameCatalogName', () => {
	it.each([
		['Testament', 'Testament (2)'],
		['Motörhead', 'Motorhead'],
		['The Haunted', 'Haunted'],
		['Emerson, Lake & Palmer', 'Emerson Lake and Palmer'],
		['...And Justice for All', 'And Justice For All'],
		['  Slayer ', 'SLAYER'],
	])('reads %p and %p as the same name', (one, other) => {
		expect(isSameCatalogName(one, other)).toBe(true);
	});

	it.each([
		['Testament', 'Testimony'],
		['Death', 'Death Angel'],
		['Exodus', 'Exodus (Band)'],
	])('keeps %p and %p apart', (one, other) => {
		expect(isSameCatalogName(one, other)).toBe(false);
	});

	it('never matches a name that normalises to nothing', () => {
		expect(isSameCatalogName('', '')).toBe(false);
		expect(isSameCatalogName('...', '!!!')).toBe(false);
	});
});

describe('normalizeCatalogName', () => {
	it('reduces a name to what the two import roads agree on', () => {
		expect(normalizeCatalogName('The Motörhead (3)')).toBe('motorhead');
	});
});

describe('duplicateCatalogNames', () => {
	const artists = [
		{ uid: 'a', name: 'Testament' },
		{ uid: 'b', name: 'Testament (2)' },
		{ uid: 'c', name: 'The Testament' },
		{ uid: 'd', name: 'Exodus' },
		{ uid: 'e', name: 'Motörhead' },
		{ uid: 'f', name: 'Motorhead' },
		{ uid: 'g', name: '...' },
	];

	it('groups what the catalog cannot tell apart, largest first', () => {
		const groups = duplicateCatalogNames(artists, (a) => a.name);

		expect(groups.map((group) => group.map((a) => a.uid))).toEqual([
			['a', 'b', 'c'],
			['e', 'f'],
		]);
	});

	it('leaves out what appears once', () => {
		expect(
			duplicateCatalogNames(artists, (a) => a.name).flat()
		).not.toContainEqual({ uid: 'd', name: 'Exodus' });
	});
});
