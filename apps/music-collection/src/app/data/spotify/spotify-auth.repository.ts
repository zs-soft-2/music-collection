import { DOCUMENT, Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SpotifyToken } from './spotify.model';

const ACCOUNTS = 'https://accounts.spotify.com';
const SCOPES = [
	'streaming',
	'user-read-email',
	'user-read-private',
	'user-read-playback-state',
	'user-modify-playback-state',
];
const PENDING_KEY = 'mc-spotify-pending-login';

interface PendingLogin {
	state: string;
	verifier: string;
	returnUrl: string;
}

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
}

const base64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

const randomString = (byteCount: number) =>
	base64Url(crypto.getRandomValues(new Uint8Array(byteCount)));

/**
 * Spotify sign-in with the Authorization Code + PKCE flow (no client secret).
 * Only the exchange lives here: where the resulting token is kept is the
 * account's business, and `SpotifyTokenService` answers for it.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyAuthRepository {
	private readonly document = inject(DOCUMENT);

	public get clientId(): string {
		return environment.spotify.clientId;
	}

	/** Spotify allows http only on a loopback IP, so use 127.0.0.1 locally. */
	public get redirectUri(): string {
		return `${this.document.location.origin}/spotify/callback`;
	}

	public async authorizeUrl(returnUrl: string): Promise<string> {
		const verifier = randomString(48);
		const challenge = base64Url(
			new Uint8Array(
				await crypto.subtle.digest(
					'SHA-256',
					new TextEncoder().encode(verifier)
				)
			)
		);
		const pending: PendingLogin = {
			state: randomString(16),
			verifier,
			returnUrl,
		};
		sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: 'code',
			redirect_uri: this.redirectUri,
			code_challenge_method: 'S256',
			code_challenge: challenge,
			state: pending.state,
			scope: SCOPES.join(' '),
		});

		return `${ACCOUNTS}/authorize?${params}`;
	}

	/** Exchanges the callback's code; returns the page the login started on. */
	public async exchangeCode(
		code: string,
		state: string
	): Promise<{ token: SpotifyToken; returnUrl: string }> {
		const pending = this.takePendingLogin();
		if (!pending || pending.state !== state) {
			throw new Error('The Spotify sign-in could not be verified.');
		}

		const token = await this.requestToken(
			new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: this.redirectUri,
				client_id: this.clientId,
				code_verifier: pending.verifier,
			}),
			null
		);

		return { token, returnUrl: pending.returnUrl };
	}

	public refresh(token: SpotifyToken): Promise<SpotifyToken> {
		return this.requestToken(
			new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: token.refreshToken,
				client_id: this.clientId,
			}),
			token.refreshToken
		);
	}

	private takePendingLogin(): PendingLogin | null {
		const stored = sessionStorage.getItem(PENDING_KEY);
		sessionStorage.removeItem(PENDING_KEY);

		return stored ? (JSON.parse(stored) as PendingLogin) : null;
	}

	private async requestToken(
		body: URLSearchParams,
		previousRefreshToken: string | null
	): Promise<SpotifyToken> {
		const response = await fetch(`${ACCOUNTS}/api/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
		});
		if (!response.ok) {
			throw new Error(
				`Spotify token request failed (${response.status}).`
			);
		}
		const result = (await response.json()) as TokenResponse;

		return {
			accessToken: result.access_token,
			// A refresh response may omit it: the previous one stays valid.
			refreshToken: result.refresh_token ?? previousRefreshToken ?? '',
			expiresAt: Date.now() + result.expires_in * 1000,
		};
	}
}
