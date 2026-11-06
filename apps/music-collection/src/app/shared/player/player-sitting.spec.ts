import type { Listening, PlayRequest } from './player-request';
import {
	MIN_SITTING_MS,
	type Sitting,
	SittingLog,
	heardMs,
	toLogEntry,
} from './player-sitting';

const request = (albumId: string): PlayRequest => ({
	context: 'album',
	albumId,
	albumTitle: 'V',
	artistName: 'Havok',
	artistId: 'artist-havok',
	coverUrl: null,
	styles: [],
	spotifyAlbumId: null,
	youtubePlaylistId: null,
	tracks: [
		{ id: 'track-1', name: 'Post-Truth Era', index: 1 },
		{ id: 'track-2', name: 'Fear Campaign', index: 2 },
	],
	trackId: null,
	trackName: null,
	youtubeVideoId: null,
	spotifyTrackId: null,
	youtubeVideoIds: [],
});

const heard = (
	albumId: string,
	playing: boolean,
	trackId: string | null = 'track-1'
): Listening => ({
	request: request(albumId),
	source: 'spotify',
	playing,
	trackId,
});

const sitting = (changes: Partial<Sitting> = {}): Sitting => ({
	albumId: 'album-1',
	albumTitle: 'V',
	artistName: 'Havok',
	artistId: 'artist-havok',
	source: 'youtube',
	startedAt: 1_000,
	trackCount: 2,
	heard: new Set(['track-1']),
	playedMs: 40_000,
	playingSince: null,
	endedAt: 41_000,
	...changes,
});

describe('heardMs', () => {
	it('counts the ended spans', () => {
		expect(heardMs(sitting(), 99_000)).toBe(40_000);
	});

	it('counts the open span up to now', () => {
		expect(heardMs(sitting({ playingSince: 50_000 }), 60_000)).toBe(50_000);
	});
});

describe('toLogEntry', () => {
	it('writes the sitting as the log keeps it', () => {
		expect(toLogEntry(sitting(), 99_000)).toEqual({
			uid: 'album-1-1000',
			albumId: 'album-1',
			albumTitle: 'V',
			artistName: 'Havok',
			source: 'youtube',
			startedAt: 1_000,
			endedAt: 41_000,
			playedMs: 40_000,
			playedTracks: 1,
			trackCount: 2,
			completed: false,
		});
	});

	it('ends a sitting still playing now', () => {
		expect(
			toLogEntry(sitting({ playingSince: 50_000 }), 60_000)
		).toMatchObject({ endedAt: 60_000, playedMs: 50_000 });
	});

	it('completes a record every track of which was heard', () => {
		expect(
			toLogEntry(
				sitting({ heard: new Set(['track-1', 'track-2']) }),
				99_000
			).completed
		).toBe(true);
	});

	it('never completes a record without tracks', () => {
		expect(
			toLogEntry(sitting({ trackCount: 0, heard: new Set() }), 99_000)
				.completed
		).toBe(false);
	});
});

describe('SittingLog', () => {
	it('has nothing to write before anything was heard', () => {
		const log = new SittingLog();

		expect(log.isWithOther(null)).toBe(false);
		expect(log.take(true, 0)).toBeNull();
	});

	it('writes nothing of a record passed over on the way', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true), 0);

		expect(log.take(false, MIN_SITTING_MS - 1)).toBeNull();
	});

	it('counts what plays, leaves the pauses out, and names its tracks', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true, 'track-1'), 0);
		log.hear(heard('album-1', false), 20_000);
		log.hear(heard('album-1', true, 'track-2'), 50_000);

		expect(log.take(false, 70_000)).toEqual({
			entry: expect.objectContaining({
				uid: 'album-1-0',
				playedMs: 40_000,
				playedTracks: 2,
				endedAt: 70_000,
				completed: true,
			}),
			artistId: 'artist-havok',
		});
	});

	it('writes the same sitting again until it is ended', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true), 0);

		expect(log.take(false, 40_000)?.entry.uid).toBe('album-1-0');
		expect(log.take(true, 50_000)?.entry.uid).toBe('album-1-0');
		expect(log.take(true, 60_000)).toBeNull();
	});

	it('knows when another record went on', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true), 0);

		expect(log.isWithOther('album-1')).toBe(false);
		expect(log.isWithOther('album-2')).toBe(true);
		expect(log.isWithOther(null)).toBe(true);
	});

	it('closes the open span on a pause', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true), 0);
		log.pause(35_000);

		expect(log.take(true, 90_000)?.entry).toMatchObject({
			playedMs: 35_000,
			endedAt: 35_000,
		});
	});

	it('keeps the sitting with the record it opened on', () => {
		const log = new SittingLog();

		log.hear(heard('album-1', true), 0);
		log.hear({ ...heard('album-1', true), source: 'youtube' }, 10_000);

		expect(log.take(true, 40_000)?.entry.source).toBe('spotify');
	});
});
