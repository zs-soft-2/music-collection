import {
	criteriaFingerprint,
	prepareDefinition,
	validateCriteria,
} from './music-collection-definition';

const definition = (overrides: Record<string, unknown> = {}) => ({
	name: '1988 Bay Area Thrash',
	slug: 'bay-area-1988',
	criteria: { years: { equals: 1988 } },
	...overrides,
});

describe('validateCriteria', () => {
	it('átengedi az ismert szűrőket', () => {
		expect(
			validateCriteria({
				years: { from: 1980, to: 1989 },
				styles: { includesAny: ['Thrash'] },
				artists: { includesAny: ['testament'] },
				credits: { roles: ['Producer'] },
			})
		).toEqual({
			years: { from: 1980, to: 1989 },
			styles: { includesAny: ['Thrash'] },
			artists: { includesAny: ['testament'] },
			credits: { roles: ['Producer'] },
		});
	});

	it('az üres szabályt elfogadja — a vázlat még nem mond semmit', () => {
		expect(validateCriteria(undefined)).toEqual({});
	});

	it('az ismeretlen kulcsot visszautasítja, nem hagyja figyelmen kívül', () => {
		expect(() => validateCriteria({ yaers: { equals: 1988 } })).toThrow(
			/Ismeretlen mező/
		);
		expect(() =>
			validateCriteria({ styles: { includesNone: ['Thrash'] } })
		).toThrow(/Ismeretlen mező/);
	});

	it('a semmit nem mondó szűrőt visszautasítja', () => {
		expect(() => validateCriteria({ years: {} })).toThrow(
			/nem mond semmit/
		);
		expect(() => validateCriteria({ styles: { includesAny: [] } })).toThrow(
			/üres lista/
		);
	});

	it('a fordított intervallumot visszautasítja', () => {
		expect(() =>
			validateCriteria({ years: { from: 1989, to: 1980 } })
		).toThrow(/fordítva/);
	});

	it('az évszámot számként kéri, és értelmes tartományban', () => {
		expect(() => validateCriteria({ years: { equals: '1988' } })).toThrow(
			/Érvénytelen évszám/
		);
		expect(() => validateCriteria({ years: { equals: 12988 } })).toThrow(
			/Érvénytelen évszám/
		);
	});

	it('a listából kiszedi az ismétlést', () => {
		expect(
			validateCriteria({ styles: { includesAny: ['Thrash', 'Thrash'] } })
		).toEqual({ styles: { includesAny: ['Thrash'] } });
	});
});

describe('prepareDefinition', () => {
	it('a hiányzó mezőket alapértelmezésre hozza', () => {
		expect(prepareDefinition(definition())).toEqual({
			name: '1988 Bay Area Thrash',
			slug: 'bay-area-1988',
			description: null,
			coverImageUrl: null,
			icon: null,
			criteria: { years: { equals: 1988 } },
			badge: null,
			parentUid: null,
			status: 'draft',
			visibility: 'public',
		});
	});

	it('a slugot kisbetűsíti, és az alakját megköveteli', () => {
		expect(
			prepareDefinition(definition({ slug: 'Bay-Area-1988' })).slug
		).toBe('bay-area-1988');
		expect(() =>
			prepareDefinition(definition({ slug: 'bay area 1988' }))
		).toThrow(/slug/);
	});

	it('szűrő nélkül nem enged publikálni', () => {
		expect(() =>
			prepareDefinition(definition({ criteria: {}, status: 'published' }))
		).toThrow(/publikálni/);
		expect(
			prepareDefinition(definition({ criteria: {}, status: 'draft' }))
				.status
		).toBe('draft');
	});

	it('az ismeretlen státuszt és láthatóságot visszautasítja', () => {
		expect(() => prepareDefinition(definition({ status: 'live' }))).toThrow(
			/status/
		);
		expect(() =>
			prepareDefinition(definition({ visibility: 'secret' }))
		).toThrow(/visibility/);
	});

	it('az ismeretlen mezőt nem írja be a dokumentumba', () => {
		expect(() =>
			prepareDefinition(definition({ ownerTenantId: 'other-tenant' }))
		).toThrow(/Ismeretlen mező/);
	});

	it('a badge-et kiegészíti, a nevét megköveteli', () => {
		expect(
			prepareDefinition(
				definition({ badge: { name: 'Thrash Historian' } })
			).badge
		).toEqual({
			name: 'Thrash Historian',
			description: null,
			icon: null,
			artworkUrl: null,
		});
		expect(() =>
			prepareDefinition(definition({ badge: { icon: 'pi pi-star' } }))
		).toThrow(/badge neve/);
	});

	it('a nevet megköveteli', () => {
		expect(() => prepareDefinition(definition({ name: '   ' }))).toThrow(
			/név/
		);
	});
});

describe('criteriaFingerprint', () => {
	it('a kulcssorrendre nem érzékeny', () => {
		expect(
			criteriaFingerprint({
				years: { from: 1980, to: 1989 },
				styles: { includesAny: ['Thrash'] },
			})
		).toBe(
			criteriaFingerprint({
				styles: { includesAny: ['Thrash'] },
				years: { to: 1989, from: 1980 },
			})
		);
	});

	it('a tényleges változást megmutatja', () => {
		expect(criteriaFingerprint({ years: { equals: 1988 } })).not.toBe(
			criteriaFingerprint({ years: { equals: 1989 } })
		);
		// A lista sorrendje szűrőt cserél, nem csak írásmódot.
		expect(criteriaFingerprint({ styles: ['a', 'b'] })).not.toBe(
			criteriaFingerprint({ styles: ['b', 'a'] })
		);
	});
});
