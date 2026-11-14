import {
	RarityInput,
	haveOf,
	rarityInputsChanged,
	rarityChanged,
	rateRelease,
	tierFromEdition,
	tierFromHave,
	tierFromTags,
	toRarityInput,
} from './release-rarity';

const NOW = Date.UTC(2026, 10, 14);

function input(overrides: Partial<RarityInput> = {}): RarityInput {
	return {
		generic: false,
		override: null,
		editionSize: null,
		have: null,
		releaseYear: 1988,
		albumYear: 1988,
		descriptions: ['reissue'],
		...overrides,
	};
}

describe('tierFromHave', () => {
	it('annál ritkább, minél kevesebb gyűjtőnek van meg', () => {
		expect(
			[24, 25, 99, 100, 299, 300, 999, 1000].map(tierFromHave)
		).toEqual([
			'ultraRare',
			'veryRare',
			'veryRare',
			'rare',
			'rare',
			'uncommon',
			'uncommon',
			'common',
		]);
	});
});

describe('tierFromEdition', () => {
	it('annál ritkább, minél kevesebb készült belőle', () => {
		expect(
			[100, 101, 300, 301, 1000, 1001, 3000, 3001].map(tierFromEdition)
		).toEqual([
			'ultraRare',
			'veryRare',
			'veryRare',
			'rare',
			'rare',
			'uncommon',
			'uncommon',
			'common',
		]);
	});
});

describe('tierFromTags', () => {
	const tags = (overrides: Partial<RarityInput>) =>
		tierFromTags(input(overrides), NOW);

	it('a sima utánnyomás gyakori', () => {
		expect(tags({ releaseYear: 2010 })).toBe('common');
	});

	it('a limitált kiadás vagy a régi eredeti nyomás ritkább', () => {
		expect(
			tags({
				releaseYear: 2010,
				descriptions: ['limited edition', 'reissue'],
			})
		).toBe('uncommon');
		expect(tags({ descriptions: [] })).toBe('uncommon');
	});

	it('a kettő együtt ritka — és ennél feljebb címkéből nem megy', () => {
		expect(tags({ descriptions: ['limited edition'] })).toBe('rare');
	});

	it('a friss lemez eredeti nyomása semmit nem ér: mindegyik az', () => {
		expect(
			tags({ releaseYear: 2020, albumYear: 2020, descriptions: [] })
		).toBe('common');
	});

	it('év nélkül nem állítja, hogy eredeti', () => {
		expect(tags({ releaseYear: null, descriptions: [] })).toBe('common');
	});
});

describe('rateRelease', () => {
	const rate = (overrides: Partial<RarityInput>) =>
		rateRelease(input(overrides), NOW);

	it('az általános példány mindig gyakori', () => {
		expect(
			rate({ generic: true, have: 3, override: 'ultraRare' })
		).toMatchObject({ tier: 'common', source: 'catalog', have: null });
	});

	it('a kurátor szava mindent felülír', () => {
		expect(
			rate({ override: 'veryRare', have: 50_000, editionSize: 100_000 })
		).toMatchObject({ tier: 'veryRare', source: 'manual' });
	});

	it('a példányszám és a Discogs közül a ritkább szint érvényes', () => {
		expect(rate({ editionSize: 500, have: 5000 })).toMatchObject({
			tier: 'rare',
			source: 'edition',
		});
		expect(rate({ editionSize: 5000, have: 40 })).toMatchObject({
			tier: 'veryRare',
			source: 'discogs',
			have: 40,
		});
	});

	it('csak a Discogs-ból is megvan a szint', () => {
		expect(rate({ have: 214 })).toEqual({
			tier: 'rare',
			source: 'discogs',
			have: 214,
			calculatedAt: NOW,
		});
	});

	it('a két évnél fiatalabb kiadás Discogs-ból legfeljebb ritkább', () => {
		expect(
			rate({ have: 3, releaseYear: 2025, albumYear: 2025 })
		).toMatchObject({ tier: 'uncommon', source: 'discogs' });
		// Két év után a szám már azt jelenti, amit mond.
		expect(rate({ have: 3, releaseYear: 2024, albumYear: 2024 }).tier).toBe(
			'ultraRare'
		);
	});

	it('a friss, számozott széria ettől még ritka marad', () => {
		expect(
			rate({
				have: 3,
				editionSize: 100,
				releaseYear: 2026,
				albumYear: 2026,
			})
		).toMatchObject({ tier: 'ultraRare', source: 'edition' });
	});

	it('Discogs és példányszám nélkül a címkék döntenek', () => {
		expect(rate({ descriptions: ['limited edition'] })).toMatchObject({
			tier: 'rare',
			source: 'catalog',
			have: null,
		});
	});
});

describe('toRarityInput', () => {
	it('a kiadás dokumentumából azt olvassa ki, ami a szinthez kell', () => {
		expect(
			toRarityInput(
				{
					generic: false,
					editionSize: 500,
					date: Date.UTC(1988, 4, 5),
					album: { year: 1988 },
					formatDescription: ['Limited Edition', 'reissue'],
					rarityOverride: { tier: 'rare', note: 'kézzel' },
				},
				120
			)
		).toEqual({
			generic: false,
			override: 'rare',
			editionSize: 500,
			have: 120,
			releaseYear: 1988,
			albumYear: 1988,
			descriptions: ['limited edition', 'reissue'],
		});
	});

	it('amit nem ért, azt nem hiszi el', () => {
		expect(
			toRarityInput(
				{
					editionSize: -5,
					date: 'tavaly',
					formatDescription: 'reissue',
					rarityOverride: { tier: 'legendary' },
				},
				null
			)
		).toEqual({
			generic: false,
			override: null,
			editionSize: null,
			have: null,
			releaseYear: null,
			albumYear: null,
			descriptions: ['reissue'],
		});
	});
});

describe('haveOf', () => {
	it('a Discogs válaszából csak a „have" számot veszi ki', () => {
		const response = {
			community: { have: 214, want: 900, rating: { average: 4.5 } },
			lowest_price: 120.5,
			num_for_sale: 7,
		};

		expect(haveOf(response)).toBe(214);
	});

	it('szám híján nem talál ki egyet', () => {
		expect(haveOf({})).toBeNull();
		expect(haveOf({ community: { have: '214' } })).toBeNull();
		expect(haveOf(null)).toBeNull();
	});
});

describe('rarityChanged', () => {
	const next = rateRelease(input({ have: 214 }), NOW);

	it('csak a szint vagy a forrás változására kér írást', () => {
		expect(rarityChanged(null, next)).toBe(true);
		expect(
			rarityChanged({ tier: 'rare', source: 'discogs', have: 200 }, next)
		).toBe(false);
		expect(
			rarityChanged({ tier: 'uncommon', source: 'discogs' }, next)
		).toBe(true);
		expect(rarityChanged({ tier: 'rare', source: 'edition' }, next)).toBe(
			true
		);
	});
});

describe('rarityInputsChanged', () => {
	const release = { discogsReleaseId: 1234, editionSize: null, date: 1 };

	it('az új kiadást ki kell számolni', () => {
		expect(rarityInputsChanged(undefined, release)).toBe(true);
	});

	it('a törölt kiadást nem', () => {
		expect(rarityInputsChanged(release, undefined)).toBe(false);
	});

	it('újraszámol, ha változott, amiből a szint adódik', () => {
		expect(
			rarityInputsChanged(release, { ...release, editionSize: 500 })
		).toBe(true);
		expect(
			rarityInputsChanged(release, {
				...release,
				formatDescription: ['limited edition'],
			})
		).toBe(true);
	});

	// Különben a trigger a saját írására futna újra.
	it('a szint beírására és a névjavításra nem számol újra', () => {
		expect(
			rarityInputsChanged(release, {
				...release,
				rarity: { tier: 'rare' },
				updatedAt: 'now',
			})
		).toBe(false);
		expect(
			rarityInputsChanged(release, { ...release, name: 'Új név' })
		).toBe(false);
	});
});
