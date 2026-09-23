import { ReleaseEntity } from '@music-collection/api';

import { newestPressingFirst, toPressingRow } from './pressing-row';

const release = (overrides: Partial<ReleaseEntity> = {}): ReleaseEntity =>
	({
		uid: '1',
		name: 'Nevermind — UK press',
		date: new Date('1991-09-24').getTime(),
		media: 'vinyl',
		country: 'UK & Europe',
		formatDescription: 'LP',
		album: {
			uid: 'album-1',
			name: 'Nevermind',
			coverImageUrl: 'https://example.test/cover.jpg',
		},
		artist: { uid: 'artist-1', name: 'Nirvana' },
		label: { uid: 'label-1', name: 'Sub Pop' },
		...overrides,
	}) as ReleaseEntity;

describe('pressing rows', () => {
	it('reads a pressing as one line: the record, who made it, what it is', () => {
		expect(toPressingRow(release())).toEqual(
			expect.objectContaining({
				uid: '1',
				name: 'Nevermind — UK press',
				albumUid: 'album-1',
				albumName: 'Nevermind',
				artistUid: 'artist-1',
				artistName: 'Nirvana',
				coverUrl: 'https://example.test/cover.jpg',
				year: 1991,
				format: 'vinyl',
				formatDescription: 'LP',
				labelUid: 'label-1',
				labelName: 'Sub Pop',
				country: 'UK & Europe',
			})
		);
	});

	it('falls back to the album name when the pressing was left unnamed', () => {
		expect(toPressingRow(release({ name: '' })).name).toBe('Nevermind');
	});

	it('says nothing about a year it has no date for', () => {
		expect(
			toPressingRow(release({ date: undefined as never })).year
		).toBeNull();
	});

	it('puts the newest pressing first and the undated ones last', () => {
		const rows = [
			toPressingRow(release({ uid: 'a', date: undefined as never })),
			toPressingRow(release({ uid: 'b' })),
			toPressingRow(
				release({ uid: 'c', date: new Date('2011-01-01').getTime() })
			),
		];

		expect(newestPressingFirst(rows).map((row) => row.uid)).toEqual([
			'c',
			'b',
			'a',
		]);
	});
});
