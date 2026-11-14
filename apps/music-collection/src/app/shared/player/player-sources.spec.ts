import type { AlbumEntity } from '@music-collection/api';

import type { NowPlaying } from './player-request';
import {
	chooseSource,
	pickNow,
	playableSourcesOf,
	queuedRecordsOf,
	runningPositionMs,
} from './player-sources';

const both = { spotify: true, youtube: true };
const spotifyOnly = { spotify: true, youtube: false };
const youtubeOnly = { spotify: false, youtube: true };
const neither = { spotify: false, youtube: false };

describe('chooseSource', () => {
	const signedIn = () => true;
	const signedOut = () => false;

	it('keeps to the source the setting names, where the record has it', () => {
		expect(chooseSource('spotify', both, signedOut)).toBe('spotify');
		expect(chooseSource('youtube', both, signedIn)).toBe('youtube');
	});

	it('gives way to the other source where the record lacks it', () => {
		expect(chooseSource('spotify', youtubeOnly, signedIn)).toBe('youtube');
		expect(chooseSource('youtube', spotifyOnly, signedIn)).toBe('spotify');
	});

	it('has no source for a record on neither', () => {
		expect(chooseSource('spotify', neither, signedIn)).toBeNull();
		expect(chooseSource('youtube', neither, signedIn)).toBeNull();
		expect(chooseSource('auto', neither, signedIn)).toBeNull();
	});

	it('picks Spotify when signed in to it, else YouTube, else Spotify', () => {
		expect(chooseSource('auto', both, signedIn)).toBe('spotify');
		expect(chooseSource('auto', both, signedOut)).toBe('youtube');
		expect(chooseSource('auto', spotifyOnly, signedOut)).toBe('spotify');
		expect(chooseSource('auto', youtubeOnly, signedIn)).toBe('youtube');
	});

	// A computed reading this follows the sign-in only where it matters.
	it('asks about the sign-in only where the answer depends on it', () => {
		const connected = jest.fn(() => true);

		chooseSource('spotify', both, connected);
		chooseSource('auto', youtubeOnly, connected);

		expect(connected).not.toHaveBeenCalled();

		chooseSource('auto', both, connected);

		expect(connected).toHaveBeenCalledTimes(1);
	});
});

describe('pickNow', () => {
	const now = (
		source: NowPlaying['source'],
		playing: boolean
	): NowPlaying => ({
		source,
		title: 'Post-Truth Era',
		subtitle: 'Havok',
		coverUrl: null,
		playing,
		albumId: null,
		trackId: null,
	});
	const spotify = now('spotify', false);
	const youtube = now('youtube', false);

	it("prefers the session's own source", () => {
		expect(pickNow('spotify', spotify, youtube)).toBe(spotify);
		expect(pickNow('youtube', spotify, youtube)).toBe(youtube);
	});

	it('falls back to the other source', () => {
		expect(pickNow('spotify', null, youtube)).toBe(youtube);
		expect(pickNow('youtube', spotify, null)).toBe(spotify);
	});

	it('without a session, takes YouTube only while it plays', () => {
		const playing = now('youtube', true);

		expect(pickNow(null, spotify, playing)).toBe(playing);
		expect(pickNow(null, spotify, youtube)).toBe(spotify);
		expect(pickNow(null, null, youtube)).toBe(youtube);
		expect(pickNow(null, null, null)).toBeNull();
	});
});

const album = (uid: string, changes: Partial<AlbumEntity> = {}): AlbumEntity =>
	({ uid, name: `Album ${uid}`, ...changes }) as AlbumEntity;

describe('playableSourcesOf', () => {
	const albums = [
		album('on-spotify', { spotifyAlbumId: '4aawyAB9vmqN3uQ7FjRGTy' }),
		album('on-playlist', {
			youtubePlaylistId: 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
		}),
		album('on-video', { youtubeVideoIds: ['short', 'dQw4w9WgXcQ'] }),
		album('broken', {
			spotifyAlbumId: 'not-an-id',
			youtubeVideoIds: ['short'],
		}),
	];

	it('sorts the albums by the source a card would start them on', () => {
		expect(
			playableSourcesOf(albums, { ownApp: true, canDriveYoutube: true })
		).toEqual({
			spotify: new Set(['on-spotify']),
			youtube: new Set(['on-playlist', 'on-video']),
		});
	});

	// The embedded frame plays on the record's own page; a card has none.
	it('counts no Spotify album without the collector’s own app', () => {
		expect(
			playableSourcesOf(albums, { ownApp: false, canDriveYoutube: true })
				.spotify.size
		).toBe(0);
	});

	it('counts no YouTube album while YouTube cannot be driven', () => {
		expect(
			playableSourcesOf(albums, { ownApp: true, canDriveYoutube: false })
				.youtube.size
		).toBe(0);
	});
});

describe('queuedRecordsOf', () => {
	it('names the waiting records in queue order', () => {
		expect(
			queuedRecordsOf(
				['b', 'a'],
				[
					album('a', {
						artist: {
							uid: 'x',
							name: 'Havok',
						} as AlbumEntity['artist'],
						coverImageUrl: 'https://example.com/a.jpg',
					}),
					album('b'),
				]
			)
		).toEqual([
			{
				albumId: 'b',
				albumTitle: 'Album b',
				artistName: null,
				coverUrl: null,
			},
			{
				albumId: 'a',
				albumTitle: 'Album a',
				artistName: 'Havok',
				coverUrl: 'https://example.com/a.jpg',
			},
		]);
	});

	it('leaves out a record the catalog cannot name', () => {
		expect(queuedRecordsOf(['gone'], [album('a')])).toEqual([]);
	});
});

describe('runningPositionMs', () => {
	const reported = {
		positionMs: 10_000,
		positionAt: 1_000,
		durationMs: 60_000,
	};

	it('stays where it was reported while paused', () => {
		expect(runningPositionMs({ ...reported, playing: false }, 9_000)).toBe(
			10_000
		);
	});

	it('counts the time since the report while playing', () => {
		expect(runningPositionMs({ ...reported, playing: true }, 6_000)).toBe(
			15_000
		);
	});

	it('keeps within the record', () => {
		expect(runningPositionMs({ ...reported, playing: true }, 999_000)).toBe(
			60_000
		);
		expect(
			runningPositionMs(
				{ ...reported, positionMs: 0, playing: true },
				-5_000
			)
		).toBe(0);
	});

	it('runs on where the length is not known', () => {
		expect(
			runningPositionMs(
				{ ...reported, durationMs: 0, playing: true },
				101_000
			)
		).toBe(110_000);
	});
});
