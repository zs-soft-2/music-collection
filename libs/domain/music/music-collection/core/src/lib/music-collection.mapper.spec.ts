import { CollectionItemEntity, ReleaseEntity } from '@music-collection/api';
import { MediaEnum } from '@music-collection/common/api';

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
	media: MediaEnum.all,
	rarity: 'common',
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

	it('reads the medium the copy is on', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, { media: MediaEnum.cd }),
		]);

		expect(copies[0].media).toBe(MediaEnum.cd);
	});

	it('weighs a copy that names no medium as the least of them', () => {
		expect(toOwnedCopies([copy('a', 'new-order')])[0].media).toBe(
			MediaEnum.all
		);
	});

	it('reads the rarity the server worked out for the pressing', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, { rarity: { tier: 'rare' } }),
		]);

		expect(copies[0].rarity).toBe('rare');
	});

	it('takes the tier from the catalog rather than the copy that grew old', () => {
		const copies = toOwnedCopies(
			[
				copy('a', 'new-order', null, {
					uid: 'pressing',
					rarity: { tier: 'rare' },
				}),
			],
			[{ uid: 'pressing', rarity: { tier: 'veryRare' } } as ReleaseEntity]
		);

		expect(copies[0].rarity).toBe('veryRare');
	});

	it('calls a pressing nobody has weighed yet common', () => {
		expect(toOwnedCopies([copy('a', 'new-order')])[0].rarity).toBe(
			'common'
		);
	});

	it('calls a generic copy common, whatever it carries', () => {
		const copies = toOwnedCopies([
			copy('a', 'new-order', null, {
				generic: true,
				rarity: { tier: 'ultraRare' },
			}),
		]);

		expect(copies[0].rarity).toBe('common');
	});
});
