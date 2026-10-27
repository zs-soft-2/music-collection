import { PublicCollectorProfile } from './collector-profile.model';
import {
	MOSAIC_COUNT,
	ShareCardLabels,
	shareCardCovers,
	shareCardPlace,
	shareCardSummary,
} from './share-card';

const labels: ShareCardLabels = {
	records: 'records',
	points: 'points',
	badges: 'badges',
	tagline: 'Collection',
};

const profile = (
	changes: Partial<PublicCollectorProfile> = {}
): PublicCollectorProfile => ({
	uid: 'u1',
	numbers: {
		copies: 312,
		albums: 280,
		artists: 94,
		byFormat: { vinyl: 312 },
		oldestYear: 1971,
		since: 2019,
	},
	points: { total: 1240, completedCollections: 4 },
	badges: [],
	pursuits: [],
	showcase: [],
	...changes,
});

const cover = (url: string | null) => ({
	title: 'Reign in Blood',
	artistName: 'Slayer',
	year: 1986,
	format: 'vinyl' as const,
	coverUrl: url,
	editions: [],
});

describe('shareCardSummary', () => {
	it('names the records, the points and the badges', () => {
		expect(shareCardSummary(profile(), labels)).toBe(
			'312 records · 1240 points · 4 badges'
		);
	});

	/** A collector with no badge yet is not advertising that. */
	it('leaves out what there is none of', () => {
		expect(
			shareCardSummary(
				profile({ points: { total: 0, completedCollections: 0 } }),
				labels
			)
		).toBe('312 records');
	});
});

describe('shareCardPlace', () => {
	it('names the city and the country where both are shared', () => {
		expect(
			shareCardPlace(profile({ city: 'Budapest', countryCode: 'HU' }))
		).toBe('Budapest, HU');
	});

	it('says nothing where no place is shared', () => {
		expect(shareCardPlace(profile())).toBe('');
	});
});

describe('shareCardCovers', () => {
	it('takes as many covers as the mosaic holds', () => {
		const covers = shareCardCovers(
			profile({
				showcase: Array.from(
					{ length: MOSAIC_COUNT + 4 },
					(_at, index) => cover(`https://e.test/${index}.jpg`)
				),
			})
		);

		expect(covers).toHaveLength(MOSAIC_COUNT);
	});

	/**
	 * The card is drawn in the collector's browser and read back out of a
	 * canvas; a picture from anywhere but a web address would either fail to
	 * load or taint the canvas, and the share would fail with it.
	 */
	it('skips a cover that is not a web address', () => {
		const covers = shareCardCovers(
			profile({
				showcase: [
					cover('javascript:alert(1)'),
					cover(null),
					cover('https://e.test/good.jpg'),
				],
			})
		);

		expect(covers).toEqual(['https://e.test/good.jpg']);
	});

	it('has no covers where the window is empty', () => {
		expect(shareCardCovers(profile())).toEqual([]);
	});
});
