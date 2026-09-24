import { SPOTIFY_TOKEN_SETTING } from './spotify-token.setting';

describe('SPOTIFY_TOKEN_SETTING', () => {
	const token = {
		accessToken: 'access',
		refreshToken: 'refresh',
		expiresAt: 1_700_000_000_000,
	};

	it('reads no connection out of a missing document', () => {
		expect(SPOTIFY_TOKEN_SETTING.toValue({})).toBeNull();
	});

	it('keeps a stored connection', () => {
		expect(SPOTIFY_TOKEN_SETTING.toValue({ ...token })).toEqual(token);
	});

	/** What disconnecting writes: the document stays, the connection does not. */
	it('reads the emptied document as no connection', () => {
		expect(
			SPOTIFY_TOKEN_SETTING.toValue(
				SPOTIFY_TOKEN_SETTING.toDocument(null)
			)
		).toBeNull();
	});

	/**
	 * A half-written document must not pass for a connection: the player would
	 * take it, ask Spotify with nonsense and report itself broken.
	 */
	it('refuses a half-written document', () => {
		expect(
			SPOTIFY_TOKEN_SETTING.toValue({
				accessToken: 'access',
				refreshToken: 'refresh',
			})
		).toBeNull();
		expect(
			SPOTIFY_TOKEN_SETTING.toValue({ ...token, expiresAt: 'soon' })
		).toBeNull();
	});
});
