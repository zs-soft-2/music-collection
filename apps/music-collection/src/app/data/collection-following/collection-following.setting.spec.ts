import { COLLECTION_FOLLOWING_SETTING } from './collection-following.setting';

describe('COLLECTION_FOLLOWING_SETTING', () => {
	it('reads nothing followed from an empty document', () => {
		expect(COLLECTION_FOLLOWING_SETTING.toValue({})).toEqual({
			followed: [],
			shown: [],
		});
	});

	it('keeps the stored order', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({ followed: ['b', 'a'] })
		).toEqual({ followed: ['b', 'a'], shown: [] });
	});

	it('drops what is not a uid', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({ followed: ['a', 7, null] })
		).toEqual({ followed: ['a'], shown: [] });
	});

	it('survives a document written with another shape', () => {
		expect(COLLECTION_FOLLOWING_SETTING.toValue({ followed: 'a' })).toEqual(
			{ followed: [], shown: [] }
		);
	});

	it('reads which of them are shown to others', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({
				followed: ['a', 'b'],
				shown: ['b'],
			})
		).toEqual({ followed: ['a', 'b'], shown: ['b'] });
	});

	/**
	 * Showing a collection says the collector is after it, so one they no
	 * longer follow cannot stay shown — however the document came to say so.
	 */
	it('drops a shown collection that is not followed', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({
				followed: ['a'],
				shown: ['a', 'gone'],
			})
		).toEqual({ followed: ['a'], shown: ['a'] });
	});

	it('writes both lists back as they stand', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toDocument({
				followed: ['a', 'b'],
				shown: ['b'],
			})
		).toEqual({ followed: ['a', 'b'], shown: ['b'] });
	});
});
