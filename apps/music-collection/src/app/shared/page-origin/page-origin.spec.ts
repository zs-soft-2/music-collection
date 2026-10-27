import {
	collectionOrigin,
	collectionOriginParams,
	collectionOriginSlug,
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
});
