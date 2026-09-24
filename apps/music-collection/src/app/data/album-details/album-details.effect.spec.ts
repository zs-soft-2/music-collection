import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ContributionEntity, TrackEntity } from '@music-collection/api';

import { AlbumDetailsEffect } from './album-details.effect';
import { AlbumDetailsRepository } from './album-details.repository';

const ALBUM = 'album-1';
const JAPAN = 'release-japan';
const GERMANY = 'release-germany';

function track(uid: string, index: number, releaseUid?: string): TrackEntity {
	return {
		uid,
		entityType: 'Track',
		albumUid: ALBUM,
		releaseUid: releaseUid ?? null,
		index,
		position: String(index),
		name: `Track ${index}`,
		duration: null,
		durationSec: null,
		heading: null,
	} as TrackEntity;
}

/**
 * The album came out with nine songs. The Japanese edition pressed a tenth,
 * and a German reissue pressed a different one. Both carry the album, so the
 * album query answers with all eleven — which is the thing the effect has to
 * take apart.
 */
const ALBUM_TRACKS = [
	...Array.from({ length: 9 }, (unused, i) => track(`t${i + 1}`, i + 1)),
	track('t-japan', 10, JAPAN),
	track('t-germany', 10, GERMANY),
];

function setUp(): AlbumDetailsEffect {
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			AlbumDetailsEffect,
			{
				provide: AlbumDetailsRepository,
				useValue: {
					listTracks$: () => of(ALBUM_TRACKS),
					listTracksByRelease$: (releaseUid: string) =>
						of(
							ALBUM_TRACKS.filter(
								(item) => item.releaseUid === releaseUid
							)
						),
					listContributions$: () => of([] as ContributionEntity[]),
				},
			},
		],
	});

	return TestBed.inject(AlbumDetailsEffect);
}

describe('AlbumDetailsEffect', () => {
	it('gives the album the nine songs it came out with', async () => {
		const { tracks } = await firstValueFrom(setUp().load$(ALBUM));

		expect(tracks.map((item) => item.uid)).toEqual([
			't1',
			't2',
			't3',
			't4',
			't5',
			't6',
			't7',
			't8',
			't9',
		]);
	});

	it('gives a Japanese copy the tenth song that pressing added', async () => {
		const { tracks } = await firstValueFrom(
			setUp().loadCopy$(ALBUM, JAPAN)
		);

		expect(tracks).toHaveLength(10);
		expect(tracks[9].uid).toBe('t-japan');
	});

	it('keeps another pressing’s bonus song off this copy', async () => {
		const { tracks } = await firstValueFrom(
			setUp().loadCopy$(ALBUM, JAPAN)
		);

		expect(tracks.map((item) => item.uid)).not.toContain('t-germany');
	});

	it('gives a copy of no known pressing the album as it is', async () => {
		const { tracks } = await firstValueFrom(setUp().loadCopy$(ALBUM, null));

		expect(tracks).toHaveLength(9);
	});
});
