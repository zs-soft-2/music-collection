import { CollectionItemEntity } from '@music-collection/api';
import { FormatDescriptionEnum } from '@music-collection/common/api';

import { toOwnedCopies } from './music-collection.mapper';

const copy = (
	uid: string,
	albumUid: string | null,
	disposal: CollectionItemEntity['disposal'] = null,
	release: Record<string, unknown> = {}
) =>
	({
		uid,
		release: albumUid
			? { album: { uid: albumUid }, ...release }
			: { ...release },
		disposal,
	}) as CollectionItemEntity;

const bare = (albumUid: string) => ({
	albumUid,
	disposedAt: null,
	releaseYear: null,
	editions: [],
});

describe('toOwnedCopies', () => {
	it('points each copy at the album it is a pressing of', () => {
		expect(toOwnedCopies([copy('a', 'new-order')])).toEqual([
			bare('new-order'),
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
		expect(toOwnedCopies([copy('a', null), copy('b', 'justice')])).toEqual([
			bare('justice'),
		]);
	});

	it('reads the pressing facts the scoring weighs', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, {
				date: new Date('1988-05-05'),
				formatDescription: [
					FormatDescriptionEnum.limitedEdition,
					FormatDescriptionEnum.g180,
				],
			}),
		]);

		expect(copies[0]).toEqual({
			albumUid: 'new-order',
			disposedAt: null,
			releaseYear: 1988,
			editions: [
				FormatDescriptionEnum.limitedEdition,
				FormatDescriptionEnum.g180,
			],
		});
	});

	it('takes a single description as well as a list', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, {
				formatDescription: FormatDescriptionEnum.reissue,
			}),
		]);

		expect(copies[0].editions).toEqual([FormatDescriptionEnum.reissue]);
	});

	it('drops a tag the catalog does not know', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, {
				formatDescription: ['gatefold', FormatDescriptionEnum.boxSet],
			}),
		]);

		expect(copies[0].editions).toEqual([FormatDescriptionEnum.boxSet]);
	});
});
