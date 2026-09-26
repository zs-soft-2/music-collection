import { NowPlaying, PlayRequest, listeningTo } from './player.store';

const request = (albumId: string): PlayRequest => ({
	context: 'album',
	albumId,
	albumTitle: 'V',
	artistName: 'Havok',
	coverUrl: null,
	styles: [],
	spotifyAlbumId: '4aawyAB9vmqN3uQ7FjRGTy',
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

const nowPlaying = (albumId: string | null): NowPlaying => ({
	source: 'spotify',
	title: 'Post-Truth Era',
	subtitle: 'Havok',
	coverUrl: null,
	playing: true,
	albumId,
	trackId: 'track-1',
});

const silent = { drives: false, playing: false };

describe('listeningTo', () => {
	it('hears nothing while nothing is on', () => {
		expect(listeningTo(null, null, request('album-1'), silent)).toBeNull();
	});

	it('follows the record this player put on, by its track', () => {
		expect(
			listeningTo(
				nowPlaying('album-1'),
				request('album-1'),
				request('album-1'),
				silent
			)
		).toEqual({
			request: request('album-1'),
			source: 'spotify',
			playing: true,
			trackId: 'track-1',
		});
	});

	// Started on the phone, or by somebody else's hand: the app does not know
	// what record of the catalog it is, so it keeps no sitting with it.
	it('leaves alone a record this player did not put on', () => {
		expect(
			listeningTo(nowPlaying('album-2'), request('album-1'), null, silent)
		).toBeNull();
		expect(
			listeningTo(nowPlaying(null), request('album-1'), null, silent)
		).toBeNull();
	});

	it('follows the page frame where this player drives nothing', () => {
		expect(
			listeningTo(null, null, request('album-1'), {
				drives: true,
				playing: true,
			})
		).toEqual({
			request: request('album-1'),
			source: 'spotify',
			playing: true,
			// The frame names no track of ours, so no record is ever heard
			// right through by way of it.
			trackId: null,
		});
	});

	it('keeps a sitting with the frame open while it is paused', () => {
		expect(
			listeningTo(null, null, request('album-1'), {
				drives: true,
				playing: false,
			})
		).toMatchObject({ playing: false });
	});

	it('lets what this player plays win over the page frame', () => {
		expect(
			listeningTo(
				nowPlaying('album-1'),
				request('album-1'),
				request('album-2'),
				{ drives: true, playing: true }
			)
		).toMatchObject({ request: request('album-1'), trackId: 'track-1' });
	});

	it('hears nothing from a frame that holds no record of ours', () => {
		expect(
			listeningTo(null, null, null, { drives: true, playing: true })
		).toBeNull();
	});
});
