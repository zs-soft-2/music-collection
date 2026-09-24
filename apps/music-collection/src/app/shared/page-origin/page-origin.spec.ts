import {
	collectionOrigin,
	collectionOriginParams,
	collectionOriginSlug,
	collectionTrail,
} from './page-origin';

describe('page origin', () => {
	it('carries a collection there and back', () => {
		expect(collectionOriginSlug(collectionOrigin('bay-area-thrash'))).toBe(
			'bay-area-thrash'
		);
		expect(collectionOriginParams('bay-area-thrash')).toEqual({
			from: 'collection:bay-area-thrash',
		});
	});

	it('reads no collection where none is named', () => {
		expect(collectionOriginSlug(null)).toBeNull();
		expect(collectionOriginSlug('')).toBeNull();
		expect(collectionOriginSlug('collection:')).toBeNull();
		expect(collectionOriginSlug('wishlist')).toBeNull();
		expect(collectionOriginParams(null)).toBeUndefined();
	});

	/** The first crumb is the app's word; the second is the collection's own. */
	const t = (key: string) =>
		key === 'nav.collections' ? 'Collections' : key;

	it('leads back to the collection the page was opened from', () => {
		expect(
			collectionTrail('bay-area-thrash', 'Bay Area Thrash', t)
		).toEqual([
			{ label: 'Collections', link: '/collections' },
			{
				label: 'Bay Area Thrash',
				link: ['/collections', 'bay-area-thrash'],
			},
		]);
	});

	it('waits for the name rather than showing a wrong step', () => {
		expect(collectionTrail('bay-area-thrash', null, t)).toEqual([
			{ label: 'Collections', link: '/collections' },
		]);
	});

	it('gives no trail to a page opened on its own', () => {
		expect(collectionTrail(null, null, t)).toEqual([]);
	});
});
