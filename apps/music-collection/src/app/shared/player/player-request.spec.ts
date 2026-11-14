import type { AlbumEntity, TrackEntity } from '@music-collection/api';

import {
	type PlayRequest,
	albumPlayRequest,
	toTrackToMatch,
	youtubeAlbumOf,
} from './player-request';

const SPOTIFY_ALBUM = '4aawyAB9vmqN3uQ7FjRGTy';
const PLAYLIST = 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG';
const VIDEO_1 = 'dQw4w9WgXcQ';
const VIDEO_2 = 'oHg5SJYRHA0';

const track = (uid: string, index: number): TrackEntity =>
	({ uid, name: `Track ${index}`, index }) as TrackEntity;

const album = (changes: Partial<AlbumEntity> = {}): AlbumEntity =>
	({
		uid: 'album-1',
		name: 'V',
		artist: { uid: 'artist-havok', name: 'Havok' },
		coverImageUrl: 'https://example.com/v.jpg',
		styles: ['Thrash'],
		spotifyAlbumId: SPOTIFY_ALBUM,
		youtubePlaylistId: PLAYLIST,
		youtubeVideoIds: [VIDEO_1],
		...changes,
	}) as AlbumEntity;

const request = (changes: Partial<PlayRequest> = {}): PlayRequest => ({
	context: 'album',
	albumId: 'album-1',
	albumTitle: 'V',
	artistName: 'Havok',
	artistId: null,
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
	...changes,
});

describe('toTrackToMatch', () => {
	it('holds a track by our id, with empty pictures and no clip', () => {
		expect(
			toTrackToMatch({
				...track('track-1', 1),
				position: 'A1',
			} as TrackEntity)
		).toEqual({
			id: 'track-1',
			name: 'Track 1',
			index: 1,
			position: 'A1',
			images: [],
			clip: null,
		});
	});
});

describe('albumPlayRequest', () => {
	it('plays the whole album from its start', () => {
		expect(
			albumPlayRequest(album(), [
				track('track-1', 1),
				track('track-2', 2),
			])
		).toEqual({
			context: 'album',
			albumId: 'album-1',
			albumTitle: 'V',
			artistName: 'Havok',
			artistId: 'artist-havok',
			coverUrl: 'https://example.com/v.jpg',
			styles: ['Thrash'],
			spotifyAlbumId: SPOTIFY_ALBUM,
			youtubePlaylistId: PLAYLIST,
			tracks: [
				expect.objectContaining({ id: 'track-1' }),
				expect.objectContaining({ id: 'track-2' }),
			],
			trackId: null,
			trackName: null,
			youtubeVideoId: null,
			spotifyTrackId: null,
			youtubeVideoIds: [VIDEO_1],
		});
	});

	it('keeps the kind of page it was asked for', () => {
		expect(albumPlayRequest(album(), [], 'track').context).toBe('track');
	});

	// A half-typed id is nothing to hand a player.
	it('leaves out ids that are not ones', () => {
		const played = albumPlayRequest(
			album({
				spotifyAlbumId: 'not-an-id',
				youtubePlaylistId: 'nope',
				youtubeVideoIds: ['short', VIDEO_2],
				artist: undefined,
				styles: undefined,
			}),
			[]
		);

		expect(played).toMatchObject({
			spotifyAlbumId: null,
			youtubePlaylistId: null,
			youtubeVideoIds: [VIDEO_2],
			artistName: null,
			artistId: null,
			styles: [],
		});
	});
});

describe('youtubeAlbumOf', () => {
	it('puts the track video first, then the playlist and the other videos', () => {
		expect(
			youtubeAlbumOf(
				request({
					youtubeVideoId: VIDEO_2,
					youtubePlaylistId: PLAYLIST,
					youtubeVideoIds: [VIDEO_1, VIDEO_2],
					coverUrl: 'https://example.com/v.jpg',
				})
			)
		).toEqual({
			uid: 'album-1',
			title: 'V',
			artistName: 'Havok',
			coverUrl: 'https://example.com/v.jpg',
			items: [
				{ kind: 'video', id: VIDEO_2 },
				{ kind: 'playlist', id: PLAYLIST },
				{ kind: 'video', id: VIDEO_1 },
			],
			trackNames: ['Post-Truth Era', 'Fear Campaign'],
		});
	});

	it('names no artist as an empty one, and has nothing to play without ids', () => {
		expect(youtubeAlbumOf(request({ artistName: null }))).toMatchObject({
			artistName: '',
			items: [],
		});
	});
});
