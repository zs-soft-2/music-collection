import { EntityTypeEnum } from '@music-collection/common/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';
import { scoreCollection } from '@music-collection/domain/music-collection/engine';

import { ScanCandidate } from '@music-collection/api';

import { toAlbumCollections, toPhotoVersionViews } from './album.mapper';

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
			basePoints: null,
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
		score: scoreCollection(
			{
				collectionUid: name,
				criteriaVersion: 1,
				albums: [],
				total: albumUids.length,
				calculatedAt: 0,
			},
			[],
			null,
			missingAlbumUids.length === 0
		),
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

describe('toPhotoVersionViews', () => {
	const candidate = (
		overrides: Partial<ScanCandidate> = {}
	): ScanCandidate => ({
		discogsReleaseId: 1234,
		discogsMasterId: 42,
		title: 'Mercyful Fate - Melissa',
		artistName: 'Mercyful Fate',
		albumName: 'Melissa',
		formats: ['Vinyl', 'LP', 'Album'],
		label: 'Roadrunner Records',
		catno: 'RR 9862',
		country: 'Netherlands',
		year: 1983,
		thumbUrl: null,
		match: 'exact',
		...overrides,
	});

	it('a fotó jelöltjeit kiadásválasztó opciókká képezi', () => {
		expect(toPhotoVersionViews([candidate()], new Set())).toEqual([
			{
				id: 1234,
				format: 'vinyl',
				formatText: 'Vinyl, LP, Album',
				label: 'Roadrunner Records',
				catno: 'RR 9862',
				country: 'Netherlands',
				year: 1983,
				discogsUrl: 'https://www.discogs.com/release/1234',
				thumbUrl: null,
				match: 'exact',
				requested: false,
			},
		]);
	});

	it('a már kért kiadást megjelöli', () => {
		const [view] = toPhotoVersionViews([candidate()], new Set([1234]));

		expect(view.requested).toBe(true);
	});

	it('a csak masterig jutó jelöltet elhagyja — abból nincs mit kérni', () => {
		expect(
			toPhotoVersionViews(
				[candidate({ discogsReleaseId: null })],
				new Set()
			)
		).toEqual([]);
	});
});
