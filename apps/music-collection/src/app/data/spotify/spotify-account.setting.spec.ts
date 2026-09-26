import { SPOTIFY_ACCOUNT_SETTING } from './spotify-account.setting';

describe('SPOTIFY_ACCOUNT_SETTING', () => {
	const clientId = '0ab3fba0933440238c563c337700db27';
	const token = {
		accessToken: 'access',
		refreshToken: 'refresh',
		expiresAt: 1_700_000_000_000,
	};

	it('reads no app out of a missing document', () => {
		expect(SPOTIFY_ACCOUNT_SETTING.toValue({})).toBeNull();
	});

	it('keeps a stored app and its connection', () => {
		expect(SPOTIFY_ACCOUNT_SETTING.toValue({ clientId, ...token })).toEqual(
			{ clientId, token }
		);
	});

	it('keeps an app that has not been connected yet', () => {
		expect(
			SPOTIFY_ACCOUNT_SETTING.toValue(
				SPOTIFY_ACCOUNT_SETTING.toDocument({ clientId, token: null })
			)
		).toEqual({ clientId, token: null });
	});

	/**
	 * The whole migration off the one app everybody shared: its token names
	 * no app, so it reads as no app at all and is never sent anywhere. The
	 * collector's own app cannot refresh it anyway — Spotify issued it to a
	 * different one.
	 */
	it('reads a document from the shared app as no app', () => {
		expect(SPOTIFY_ACCOUNT_SETTING.toValue({ ...token })).toBeNull();
		expect(
			SPOTIFY_ACCOUNT_SETTING.toValue({ clientId: '  ', ...token })
		).toBeNull();
	});

	/** What forgetting the app writes: the document stays, the app does not. */
	it('reads the emptied document as no app', () => {
		expect(
			SPOTIFY_ACCOUNT_SETTING.toValue(
				SPOTIFY_ACCOUNT_SETTING.toDocument(null)
			)
		).toBeNull();
	});

	/**
	 * A half-written token must not pass for a connection: the player would
	 * take it, ask Spotify with nonsense and report itself broken. The app
	 * itself stands, so they can simply connect again.
	 */
	it('refuses a half-written token but keeps the app', () => {
		expect(
			SPOTIFY_ACCOUNT_SETTING.toValue({
				clientId,
				accessToken: 'access',
				refreshToken: 'refresh',
			})
		).toEqual({ clientId, token: null });
		expect(
			SPOTIFY_ACCOUNT_SETTING.toValue({
				clientId,
				...token,
				expiresAt: 'soon',
			})
		).toEqual({ clientId, token: null });
	});
});
