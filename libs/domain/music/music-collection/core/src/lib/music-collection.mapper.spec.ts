import { CollectionItemEntity } from '@music-collection/api';

import { toOwnedCopies } from './music-collection.mapper';

const copy = (
	uid: string,
	albumUid: string | null,
	disposal: CollectionItemEntity['disposal'] = null
) =>
	({
		uid,
		release: albumUid ? { album: { uid: albumUid } } : {},
		disposal,
	}) as CollectionItemEntity;

describe('toOwnedCopies', () => {
	it('points each copy at the album it is a pressing of', () => {
		expect(toOwnedCopies([copy('a', 'new-order')])).toEqual([
			{ albumUid: 'new-order', disposedAt: null },
		]);
	});

	it('carries the date a copy left the collection', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', {
				reason: 'sold',
				date: 1_600_000_000_000,
				note: null,
			}),
		]);

		expect(copies[0].disposedAt).toBe(1_600_000_000_000);
	});

	it('drops a copy that names no album', () => {
		// It cannot say which record it is a pressing of, so it cannot
		// count towards any collection.
		expect(toOwnedCopies([copy('a', null), copy('b', 'justice')])).toEqual(
			[{ albumUid: 'justice', disposedAt: null }]
		);
	});
});
