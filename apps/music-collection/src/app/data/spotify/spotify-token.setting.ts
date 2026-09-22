import { DocumentData } from '@angular/fire/firestore';

import { UserSetting } from '../user-settings';
import { SpotifyToken } from './spotify.model';

/** The collector's Spotify connection, or none. */
export type SpotifyConnection = SpotifyToken | null;

/**
 * Where the connection used to live: one key for the whole browser. A token
 * kept there outlived the sign-out that should have ended it, so the next
 * collector on the same machine inherited the previous one's Spotify — their
 * devices, and control of what was playing on them. Read once, to carry a
 * connection over into the account it belongs to, and then removed.
 */
export const LEGACY_TOKEN_KEY = 'mc-spotify-token';

/** An empty or half-written document is no connection. */
const isConnection = (data: DocumentData): boolean =>
	typeof data['accessToken'] === 'string' &&
	data['accessToken'] !== '' &&
	typeof data['refreshToken'] === 'string' &&
	typeof data['expiresAt'] === 'number';

/**
 * The connection as one of the collector's own settings
 * (`user/{uid}/setting/spotify`), which the rules open to nobody else. It
 * belongs to the person and not to the machine: full playback needs their own
 * Spotify Premium, so the account is the only place the connection means
 * anything, and signing out on a shared machine now ends it.
 *
 * It is a bearer credential at rest, which the browser-only arrangement did
 * not have to reckon with: whoever can read this document can play on that
 * Spotify account until the token is revoked. That is the price of a
 * connection that follows the collector between machines, and it is why
 * nothing else is ever put in here.
 */
export const SPOTIFY_TOKEN_SETTING: UserSetting<SpotifyConnection> = {
	id: 'spotify',
	featureKey: 'spotify-setting',
	/**
	 * The settings mechanism keeps a browser copy for signed-out visitors.
	 * Nothing writes this one: a connection outside an account is the very
	 * thing being removed here, and the service reads none while signed out.
	 */
	storageKey: 'mc-spotify-connection',
	toValue: (data) =>
		isConnection(data)
			? {
					accessToken: data['accessToken'] as string,
					refreshToken: data['refreshToken'] as string,
					expiresAt: data['expiresAt'] as number,
				}
			: null,
	/** Disconnecting writes the empty document: there is no delete here. */
	toDocument: (connection) => ({
		accessToken: connection?.accessToken ?? '',
		refreshToken: connection?.refreshToken ?? '',
		expiresAt: connection?.expiresAt ?? 0,
	}),
};
