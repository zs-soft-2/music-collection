import {
	catalogFeatureKeyOf,
	ownedCollectionPath,
	ownedFeatureKey,
} from './owned';

describe('owned', () => {
	it('names the owned side of a feature', () => {
		expect(ownedFeatureKey('artist')).toBe('owned-artist');
	});

	it('never names a catalog collection, whose group is public', () => {
		expect(ownedFeatureKey('artist')).not.toBe('artist');
	});

	it('finds the catalog feature an owned key mirrors', () => {
		expect(catalogFeatureKeyOf('owned-artist')).toBe('artist');
	});

	it('says a catalog key mirrors nothing', () => {
		expect(catalogFeatureKeyOf('artist')).toBeNull();
	});

	it('puts the collection under the collector it belongs to', () => {
		expect(ownedCollectionPath('collector-1', 'artist')).toEqual([
			'user',
			'collector-1',
			'owned-artist',
		]);
	});
});
