import { EntityTypeEnum } from '@music-collection/common/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import { toAlbumCollections } from './album.mapper';

function standing(
	name: string,
	albumUids: string[],
	ownedAlbumUids: string[]
): MusicCollectionStanding {
	const missingAlbumUids = albumUids.filter(
		(uid) => !ownedAlbumUids.includes(uid)
	);

	return {
		collection: {
			entityType: EntityTypeEnum.MusicCollection,
			uid: name,
			name,
			slug: name,
			description: null,
			coverImageUrl: null,
			icon: null,
			criteria: {},
			badge: {
				name: `${name} badge`,
				description: null,
				icon: null,
				artworkUrl: null,
			},
			parentUid: null,
			status: 'published',
			visibility: 'public',
			createdAt: 0,
			criteriaVersion: 1,
		},
		resolved: {
			collectionUid: name,
			criteriaVersion: 1,
			albums: albumUids.map((albumUid) => ({
				albumUid,
				albumName: albumUid,
				artistUid: 'artist',
				artistName: 'Artist',
				year: 1988,
				coverUrl: null,
			})),
			total: albumUids.length,
			calculatedAt: 0,
		},
		progress: {
			collectionUid: name,
			total: albumUids.length,
			owned: ownedAlbumUids.length,
			missing: missingAlbumUids.length,
			percentage: Math.round(
				(ownedAlbumUids.length / albumUids.length) * 100
			),
			completed: missingAlbumUids.length === 0,
			ownedAlbumUids,
			missingAlbumUids,
		},
	};
}

describe('toAlbumCollections', () => {
	it('keeps only the collections asking for this album', () => {
		const collections = toAlbumCollections(
			[
				standing('bay-area', ['a', 'b'], ['a']),
				standing('teutonic', ['c', 'd'], []),
			],
			'a'
		);

		expect(collections.map(({ name }) => name)).toEqual(['bay-area']);
	});

	it('says whether this very record is on the shelf', () => {
		const standings = [standing('bay-area', ['a', 'b'], ['a'])];

		expect(toAlbumCollections(standings, 'a')[0].ownsThisAlbum).toBe(true);
		expect(toAlbumCollections(standings, 'b')[0].ownsThisAlbum).toBe(false);
	});

	it('puts the collection nearest to complete first', () => {
		const collections = toAlbumCollections(
			[
				standing('started', ['a', 'b', 'c', 'd'], ['a']),
				standing('almost', ['a', 'b'], ['a']),
			],
			'a'
		);

		expect(collections.map(({ name }) => name)).toEqual([
			'almost',
			'started',
		]);
	});
});
