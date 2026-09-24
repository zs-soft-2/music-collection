import { isSameCatalogNumber, normalizeCatalogNumber } from './catalog-number';

describe('normalizeCatalogNumber', () => {
	it('csak a betűket és számjegyeket tartja meg', () => {
		expect(normalizeCatalogNumber('SRM-1-1035')).toBe('srm11035');
		expect(normalizeCatalogNumber('  VILE LP 566 ')).toBe('vilelp566');
	});

	it('üres a hiányzó szám', () => {
		expect(normalizeCatalogNumber(null)).toBe('');
		expect(normalizeCatalogNumber('   ')).toBe('');
	});
});

describe('isSameCatalogNumber', () => {
	it('a tagolást megbocsátja', () => {
		expect(isSameCatalogNumber('SRM-1-1035', 'SRM 1 1035')).toBe(true);
		expect(isSameCatalogNumber('VILELP566', 'vile lp 566')).toBe(true);
	});

	it('két hiányzó szám nem egyezés', () => {
		expect(isSameCatalogNumber(null, null)).toBe(false);
		expect(isSameCatalogNumber('', 'MOVLP2620')).toBe(false);
	});

	it('a különböző számokat megkülönbözteti', () => {
		expect(isSameCatalogNumber('MOVLP2620', 'MOVLP2621')).toBe(false);
	});
});
