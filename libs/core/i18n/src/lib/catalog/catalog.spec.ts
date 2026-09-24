import { catalogKey, catalogSlug } from './catalog';

describe('catalogSlug', () => {
	it('lowercases a plain word', () => {
		expect(catalogSlug('Vinyl')).toBe('vinyl');
	});

	it('joins the words of a name', () => {
		expect(catalogSlug('box set')).toBe('box-set');
		expect(catalogSlug('The Netherlands')).toBe('the-netherlands');
	});

	it('spells out a plus, so that VG and VG+ stay apart', () => {
		expect(catalogSlug('VG')).toBe('vg');
		expect(catalogSlug('VG+')).toBe('vg-plus');
	});

	it('keeps an ampersand from swallowing the words around it', () => {
		expect(catalogSlug('UK & Europe')).toBe('uk-europe');
	});

	it('leaves a number alone', () => {
		expect(catalogSlug('180g')).toBe('180g');
	});

	it('trims what would otherwise hang off the ends', () => {
		expect(catalogSlug('  live  ')).toBe('live');
		expect(catalogSlug('rock & roll!')).toBe('rock-roll');
	});

	it('gives one thing one key however it is written', () => {
		expect(catalogSlug('Box Set')).toBe(catalogSlug('box set'));
	});
});

describe('catalogKey', () => {
	it('names the group and the value', () => {
		expect(catalogKey('format', 'lp')).toBe('catalog.format.lp');
		expect(catalogKey('country', 'The Netherlands')).toBe(
			'catalog.country.the-netherlands'
		);
	});
});
