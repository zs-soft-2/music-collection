import { firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { AlbumEntity, ArtistEntity } from '@music-collection/api';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	DocumentStateService,
} from '@music-collection/api';
import { StyleEnum } from '@music-collection/common/api';
import {
	MusicCollectionEntity,
	MusicCollectionProgress,
	MusicCollectionRepository,
	MusicCollectionScore,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

import { MusicCollectionEffect, MusicCollectionStanding } from './music-collection.effect';

/**
 * Only `suggestNextAlbums` is exercised here, and it asks nothing of the
 * catalog or of Firestore: it reads standings the caller already holds. The
 * injected services are stubbed away because reaching any of them would
 * itself be the bug.
 */
function standing(
	collectionUid: string,
	albumUids: string[],
	missingAlbumUids: string[],
	totalPoints: number
): MusicCollectionStanding {
	const albums = albumUids.map((albumUid) => ({
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: 'artist',
		artistName: 'Artist',
		year: 1988,
		coverUrl: null,
	}));

	return {
		collection: { uid: collectionUid } as MusicCollectionEntity,
		resolved: {
			collectionUid,
			criteriaVersion: 1,
			albums,
			total: albums.length,
			calculatedAt: 0,
		} as ResolvedMusicCollection,
		progress: {
			collectionUid,
			total: albums.length,
			owned: albums.length - missingAlbumUids.length,
			missing: missingAlbumUids.length,
			percentage: 0,
			completed: missingAlbumUids.length === 0,
			ownedAlbumUids: albumUids.filter(
				(albumUid) => !missingAlbumUids.includes(albumUid)
			),
			missingAlbumUids,
		} as MusicCollectionProgress,
		score: {
			collectionUid,
			basePoints: totalPoints,
			bonusPoints: 0,
			totalPoints,
			earnedPoints: 0,
			derived: true,
			highlights: [],
		} as MusicCollectionScore,
	};
}

describe('MusicCollectionEffect.suggestNextAlbums', () => {
	let effect: MusicCollectionEffect;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				MusicCollectionEffect,
				{ provide: MusicCollectionRepository, useValue: {} },
				{ provide: AlbumStateService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
				{ provide: CollectionItemStateService, useValue: {} },
				{ provide: DocumentStateService, useValue: {} },
			],
		});

		effect = TestBed.inject(MusicCollectionEffect);
	});

	/*
	 * The seam this guards: the ranking reads the *missing* uids and the
	 * *total* score of a standing. Hand it the owned ones, or the points
	 * already earned — which are zero until a collection is done — and the
	 * page would suggest records the collector has, or nothing at all.
	 */
	it('ranks the missing records of the standings it is given', () => {
		const suggestions = effect.suggestNextAlbums([
			standing('halfway', ['a', 'b', 'c', 'd'], ['c', 'd'], 1000),
			standing('nearly', ['a', 'b', 'e'], ['e'], 300),
		]);

		expect(
			suggestions.map((suggestion) => suggestion.album.albumUid)
		).toEqual(['e', 'c', 'd']);
		expect(suggestions[0].unlockedPoints).toBe(300);
		expect(suggestions[0].completesCollectionUids).toEqual(['nearly']);
		// Owned all along: never suggested to buy.
		expect(
			suggestions.map((suggestion) => suggestion.album.albumUid)
		).not.toContain('a');
	});

	it('carries the album over whole, so a suggestion can be rendered', () => {
		const [first] = effect.suggestNextAlbums([
			standing('nearly', ['a', 'b'], ['b'], 300),
		]);

		expect(first.album).toEqual({
			albumUid: 'b',
			albumName: 'Album b',
			artistUid: 'artist',
			artistName: 'Artist',
			year: 1988,
			coverUrl: null,
		});
	});

	it('suggests nothing while every collection is complete', () => {
		expect(
			effect.suggestNextAlbums([standing('done', ['a', 'b'], [], 300)])
		).toEqual([]);
	});

	it('suggests nothing before any collection has been resolved', () => {
		expect(effect.suggestNextAlbums([])).toEqual([]);
	});
});

/**
 * What the effect asks the repository for before it resolves anything. The
 * credits are the catalog's largest feature, so the question is not whether
 * resolving works — that is the engine's — but whether a rule about one
 * drummer costs one drummer's credits.
 */
describe('MusicCollectionEffect credits', () => {
	let listCredits: jest.Mock;
	let effect: MusicCollectionEffect;

	beforeEach(() => {
		listCredits = jest.fn(() => of([]));

		TestBed.configureTestingModule({
			providers: [
				MusicCollectionEffect,
				{
					provide: MusicCollectionRepository,
					useValue: { listCredits$: listCredits },
				},
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: () =>
							of([
								{
									uid: 'justice',
									name: '...And Justice for All',
									artist: { uid: 'metallica', name: 'Metallica' },
									styles: [StyleEnum.Thrash],
								} as AlbumEntity,
							]),
						dispatchListEntitiesAction: jest.fn(),
					},
				},
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: () =>
							of([
								{
									uid: 'metallica',
									styles: [StyleEnum.Thrash],
								} as ArtistEntity,
							]),
						dispatchListEntitiesAction: jest.fn(),
					},
				},
				{ provide: CollectionItemStateService, useValue: {} },
				{ provide: DocumentStateService, useValue: {} },
			],
		});

		effect = TestBed.inject(MusicCollectionEffect);
	});

	it('asks for no credits at all for a rule about styles', async () => {
		await firstValueFrom(
			effect.preview$({ styles: { includesAny: [StyleEnum.Thrash] } })
		);

		expect(listCredits).toHaveBeenCalledWith({ kind: 'none' });
	});

	/* The point of the whole arrangement: one drummer, not ten thousand credits. */
	it('asks only for the credits of the musicians a rule names', async () => {
		await firstValueFrom(
			effect.preview$({ credits: { musicians: ['hoglan'], roles: ['Drums'] } })
		);

		expect(listCredits).toHaveBeenCalledWith({
			kind: 'musicians',
			musicianUids: ['hoglan'],
		});
	});

	it('asks for every credit when a rule names a role and nobody to hold it', async () => {
		await firstValueFrom(
			effect.preview$({ credits: { roles: ['Producer'] } })
		);

		expect(listCredits).toHaveBeenCalledWith({ kind: 'all' });
	});
});
