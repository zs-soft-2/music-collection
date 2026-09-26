import { DocumentData } from '@angular/fire/firestore';

import { UserSetting } from '../user-settings';
import { SpotifyAccount, SpotifyToken } from './spotify.model';

/** The collector's Spotify app and its connection, or neither. */
export type SpotifyConnection = SpotifyAccount | null;

/**
 * Where the connection used to live: one key for the whole browser, made with
 * the one app everybody shared. Nothing in it belongs to the collector's own
 * app — a refresh token is issued to the app that asked for it — so it is
 * only ever removed now, never read.
 */
export const LEGACY_TOKEN_KEY = 'mc-spotify-token';

/** An empty or half-written token is no connection. */
const readToken = (data: DocumentData): SpotifyToken | null =>
	typeof data['accessToken'] === 'string' &&
	data['accessToken'] !== '' &&
	typeof data['refreshToken'] === 'string' &&
	typeof data['expiresAt'] === 'number'
		? {
				accessToken: data['accessToken'] as string,
				refreshToken: data['refreshToken'] as string,
				expiresAt: data['expiresAt'] as number,
			}
		: null;

/**
 * The collector's Spotify app and connection as one of their own settings
 * (`user/{uid}/setting/spotify`), which the rules open to nobody else. Both
 * belong to the person and not to the machine: the app is registered in their
 * Spotify dashboard and full playback needs their own Premium, so the account
 * is the only place either means anything.
 *
 * The token is a bearer credential at rest: whoever can read this document
 * can play on that Spotify account until it is revoked. That is the price of
 * a connection that follows the collector between machines, and it is why
 * nothing else is ever put in here.
 */
export const SPOTIFY_ACCOUNT_SETTING: UserSetting<SpotifyConnection> = {
	id: 'spotify',
	featureKey: 'spotify-setting',
	/**
	 * The settings mechanism keeps a browser copy for signed-out visitors.
	 * Nothing writes this one: an app outside an account is the very thing
	 * being avoided here, and the service reads none while signed out.
	 */
	storageKey: 'mc-spotify-connection',
	toValue: (data) => {
		const clientId =
			typeof data['clientId'] === 'string'
				? (data['clientId'] as string).trim()
				: '';

		// A document written while one app served everyone names no app, and
		// the token in it was issued to that app: neither is this
		// collector's, so the whole document reads as no app at all. Which
		// is the entire migration — the stale token is never touched again.
		return clientId ? { clientId, token: readToken(data) } : null;
	},
	/** Forgetting the app writes the empty document: there is no delete here. */
	toDocument: (account) => ({
		clientId: account?.clientId ?? '',
		accessToken: account?.token?.accessToken ?? '',
		refreshToken: account?.token?.refreshToken ?? '',
		expiresAt: account?.token?.expiresAt ?? 0,
	}),
};
