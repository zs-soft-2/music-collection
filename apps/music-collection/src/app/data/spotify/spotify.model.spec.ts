import { spotifyEmbedUri } from './spotify.model';

describe('spotifyEmbedUri', () => {
	const albumId = '4aawyAB9vmqN3uQ7FjRGTy';
	const trackId = '0eGsygTp906u18L0Oimnem';

	it('holds the album when no track is in focus', () => {
		expect(spotifyEmbedUri(albumId)).toBe(`spotify:album:${albumId}`);
	});

	it('holds the track in focus instead of its album', () => {
		expect(spotifyEmbedUri(albumId, trackId)).toBe(
			`spotify:track:${trackId}`
		);
	});

	it('holds nothing for a record Spotify does not have', () => {
		expect(spotifyEmbedUri(null)).toBeNull();
		expect(spotifyEmbedUri(undefined, null)).toBeNull();
	});

	// The player presses the frame only while the two agree on what is in
	// it, so a half-written id has to read as no frame on both sides rather
	// than as a uri the frame was never given.
	it('holds nothing for an id that is not one', () => {
		expect(spotifyEmbedUri('not-an-id')).toBeNull();
		expect(spotifyEmbedUri(albumId, 'not-an-id')).toBe(
			`spotify:album:${albumId}`
		);
	});
});
