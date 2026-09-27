import {
	isSameValue,
	toRequestChanges,
	toRequestSnapshot,
	toStorableValue,
} from './request-change';

describe('isSameValue', () => {
	it('reads every shape of emptiness as the same', () => {
		expect(isSameValue(null, undefined)).toBe(true);
		expect(isSameValue('', null)).toBe(true);
		expect(isSameValue([], undefined)).toBe(true);
	});

	it('tells an empty field from a filled one', () => {
		expect(isSameValue('', 'Pozvakowski')).toBe(false);
		expect(isSameValue(null, 0)).toBe(false);
	});

	it('compares lists in order', () => {
		expect(isSameValue(['rock', 'punk'], ['rock', 'punk'])).toBe(true);
		expect(isSameValue(['rock', 'punk'], ['punk', 'rock'])).toBe(false);
	});

	it('compares nested objects field by field', () => {
		expect(
			isSameValue({ discogs: { id: 1 } }, { discogs: { id: 1 } })
		).toBe(true);
		expect(
			isSameValue({ discogs: { id: 1 } }, { discogs: { id: 2 } })
		).toBe(false);
	});
});

describe('toStorableValue', () => {
	it('turns what Firestore cannot hold into nothing', () => {
		expect(toStorableValue(undefined)).toBeNull();
	});

	it('drops the absent fields of an object rather than the object', () => {
		expect(toStorableValue({ name: 'Nick', imageUrl: undefined })).toEqual({
			name: 'Nick',
		});
	});
});

describe('toRequestSnapshot', () => {
	it('leaves out the bookkeeping nobody decides on', () => {
		const snapshot = toRequestSnapshot({
			uid: 'a1',
			entityType: 'Artist',
			meta: { ownerId: 'u1' },
			updatedAt: 17,
			searchParameters: ['poz'],
			name: 'Pozvakowski',
		});

		expect(snapshot).toEqual({ name: 'Pozvakowski' });
	});
});

describe('toRequestChanges', () => {
	it('reads every filled-in field of a new entity as a change', () => {
		const changes = toRequestChanges(null, {
			name: 'Pozvakowski',
			country: 'HU',
			description: '',
			styles: [],
		});

		expect(changes).toEqual([
			{ field: 'country', before: null, after: 'HU', reference: null },
			{
				field: 'name',
				before: null,
				after: 'Pozvakowski',
				reference: null,
			},
		]);
	});

	it('carries only what an update would change', () => {
		const changes = toRequestChanges(
			{ name: 'Pozvakowski', country: 'HU', styles: ['rock'] },
			{ name: 'Pozvakowski', country: 'DE', styles: ['rock'] }
		);

		expect(changes).toEqual([
			{ field: 'country', before: 'HU', after: 'DE', reference: null },
		]);
	});

	it('sees a field the catalog does not have yet', () => {
		const changes = toRequestChanges(
			{ name: 'Pozvakowski' },
			{ name: 'Pozvakowski', musicBrainzId: 'mb-1' }
		);

		expect(changes).toEqual([
			{
				field: 'musicBrainzId',
				before: null,
				after: 'mb-1',
				reference: null,
			},
		]);
	});

	it('leaves the bookkeeping out of the decision', () => {
		const changes = toRequestChanges(
			{ name: 'Pozvakowski', updatedAt: 1, meta: { ownerId: 'u1' } },
			{ name: 'Pozvakowski', updatedAt: 2, meta: { ownerId: 'GLOBAL' } }
		);

		expect(changes).toEqual([]);
	});
});
