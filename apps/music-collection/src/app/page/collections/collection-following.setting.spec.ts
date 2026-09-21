import { COLLECTION_FOLLOWING_SETTING } from './collection-following.setting';

describe('COLLECTION_FOLLOWING_SETTING', () => {
	it('reads nothing followed from an empty document', () => {
		expect(COLLECTION_FOLLOWING_SETTING.toValue({})).toEqual({
			followed: [],
		});
	});

	it('keeps the stored order', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({ followed: ['b', 'a'] })
		).toEqual({ followed: ['b', 'a'] });
	});

	it('drops what is not a uid', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({ followed: ['a', 7, null] })
		).toEqual({ followed: ['a'] });
	});

	it('survives a document written with another shape', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toValue({ followed: 'a' })
		).toEqual({ followed: [] });
	});

	it('writes the list back as it stands', () => {
		expect(
			COLLECTION_FOLLOWING_SETTING.toDocument({ followed: ['a'] })
		).toEqual({ followed: ['a'] });
	});
});
