import { DOCUMENT, Injectable, computed, inject } from '@angular/core';

import { SpotifyAccountService } from './spotify-account.service';
import { SpotifyApiRepository } from './spotify-api.repository';
import { SpotifyAuthRepository } from './spotify-auth.repository';
import { SpotifyPreferencesRepository } from './spotify-preferences.repository';
import { SdkPlayer } from './spotify-sdk.types';
import { SpotifySdkRepository } from './spotify-sdk.repository';
import {
	SpotifyDevice,
	SpotifyNotConnectedError,
	SpotifyNowPlaying,
	TrackToMatch,
} from './spotify.model';

const PLAYER_NAME = 'Music Collection';
/** Refresh the token this long before it expires. */
const EXPIRY_MARGIN_MS = 60_000;

export interface BrowserPlayerEvents {
	ready: (deviceId: string) => void;
	notReady: () => void;
	stateChanged: (nowPlaying: SpotifyNowPlaying | null) => void;
	error: (message: string) => void;
}

/** "Stairway to Heaven (Remaster)" → "stairway to heaven". */
export function normalizeTrackName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\s+-\s+.*$/, '')
		.replace(/[([].*?[)\]]/g, '')
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Spotify sign-in, the in-browser player and playback on any of the account's
 * Spotify Connect devices.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyPlaybackEffect {
	private readonly account = inject(SpotifyAccountService);
	private readonly api = inject(SpotifyApiRepository);
	private readonly auth = inject(SpotifyAuthRepository);
	private readonly document = inject(DOCUMENT);
	private readonly preferences = inject(SpotifyPreferencesRepository);
	private readonly sdk = inject(SpotifySdkRepository);

	/** The collector's own Spotify app, once they have named one. */
	public readonly clientId = computed(() => this.account.clientId());

	/**
	 * The collector named their own app, so they can sign in and have this
	 * player drive Spotify itself.
	 *
	 * Spotify without it is not nothing: the embedded player needs no app of
	 * ours and no token, and plays in full for anyone signed in to Spotify in
	 * their browser. What the app buys is playback this player drives — the
	 * queue, the stage, their own speakers — so it gates those and not the
	 * album's Spotify surface as a whole.
	 */
	public readonly hasOwnApp = computed(() => !!this.clientId());

	/** Where their Spotify app has to send the sign-in back to. */
	public get redirectUri(): string {
		return this.auth.redirectUri;
	}

	public get hasToken(): boolean {
		return !!this.account.token();
	}

	/**
	 * Resolves once the account's app and connection are known. They used to
	 * come out of browser storage the instant they were asked for; they now
	 * come from a document, so anything acting on "is there an app, is there
	 * a connection" has to wait for the answer rather than read a not-yet as
	 * a no.
	 */
	public accountReady(): Promise<void> {
		return this.account.ready();
	}

	/** Names the collector's own Spotify app; an empty id forgets it. */
	public saveClientId(clientId: string): Promise<void> {
		return this.account.saveApp(clientId);
	}

	/** Remembered volume of the browser player, 0–100. */
	public get browserVolume(): number {
		return this.preferences.loadBrowserVolume();
	}

	public saveBrowserVolume(volumePercent: number): void {
		this.preferences.saveBrowserVolume(volumePercent);
	}

	public async beginLogin(returnUrl: string): Promise<void> {
		const clientId = this.clientId();
		if (!clientId) {
			throw new Error('Name a Spotify app before signing in to it.');
		}

		this.document.location.assign(
			await this.auth.authorizeUrl(clientId, returnUrl)
		);
	}

	/** Finishes the sign-in; returns the page to go back to. */
	public async completeLogin(code: string, state: string): Promise<string> {
		const { clientId, token, returnUrl } = await this.auth.exchangeCode(
			code,
			state
		);
		await this.account.saveConnection(clientId, token);

		return returnUrl;
	}

	public signOut(): void {
		// The callers treat disconnecting as done the moment they ask for it:
		// the connection is already gone from the signal, and the account
		// catching up is not something to hold them on.
		void this.account.clearToken().catch((error) => {
			console.error('Spotify connection not cleared', error);
		});
	}

	/** A valid access token, refreshed when about to expire. */
	public async accessToken(): Promise<string> {
		await this.account.ready();

		const clientId = this.clientId();
		let token = this.account.token();
		if (!clientId || !token) {
			throw new SpotifyNotConnectedError();
		}
		if (token.expiresAt - EXPIRY_MARGIN_MS < Date.now()) {
			try {
				token = await this.auth.refresh(clientId, token);
			} catch {
				this.signOut();
				throw new SpotifyNotConnectedError();
			}
			await this.account.saveConnection(clientId, token);
		}
		return token.accessToken;
	}

	/** Starts this browser as a Spotify Connect device. */
	public async startBrowserPlayer(
		events: BrowserPlayerEvents
	): Promise<SdkPlayer> {
		const player = await this.sdk.createPlayer({
			name: PLAYER_NAME,
			volume: this.browserVolume / 100,
			getOAuthToken: (callback) => {
				this.accessToken()
					.then(callback)
					.catch(() => events.error('Sign in to Spotify again.'));
			},
		});

		player.addListener('ready', ({ device_id }) => events.ready(device_id));
		player.addListener('not_ready', () => events.notReady());
		player.addListener('player_state_changed', (state) => {
			const track = state?.track_window.current_track;
			events.stateChanged(
				state && track
					? {
							trackUri: track.uri,
							trackName: track.name,
							artists: track.artists
								.map((a) => a.name)
								.join(', '),
							albumUri: track.album.uri,
							imageUrl: track.album.images.at(-1)?.url ?? null,
							paused: state.paused,
							deviceId: null,
							volumePercent: null,
							positionMs: state.position,
							durationMs: state.duration || track.duration_ms,
							positionAt: state.timestamp || Date.now(),
						}
					: null
			);
		});
		player.addListener('account_error', () =>
			events.error('Full playback needs a Spotify Premium account.')
		);
		player.addListener('authentication_error', () => {
			this.signOut();
			events.error('Sign in to Spotify again.');
		});
		player.addListener('initialization_error', ({ message }) =>
			events.error(`This browser cannot play Spotify: ${message}`)
		);
		player.addListener('playback_error', ({ message }) =>
			events.error(message)
		);

		if (!(await player.connect())) {
			throw new Error('The Spotify player could not connect.');
		}
		return player;
	}

	/**
	 * Our track id → Spotify track URI. Matched by name; when the name is not
	 * found and both tracklists have the same length, by play order.
	 */
	public async matchAlbumTracks(
		albumId: string,
		tracks: TrackToMatch[]
	): Promise<Record<string, string>> {
		const spotifyTracks = await this.api.albumTracks(
			await this.accessToken(),
			albumId
		);
		const unused = new Map<string, string[]>();
		for (const track of spotifyTracks) {
			const key = normalizeTrackName(track.name);
			unused.set(key, [...(unused.get(key) ?? []), track.uri]);
		}

		const sameLength = spotifyTracks.length === tracks.length;
		const uris: Record<string, string> = {};
		for (const track of tracks) {
			const byName = unused.get(normalizeTrackName(track.name))?.shift();
			const byOrder = sameLength
				? spotifyTracks[track.index - 1]?.uri
				: undefined;
			const uri = byName ?? byOrder;
			if (uri) {
				uris[track.id] = uri;
			}
		}
		return uris;
	}

	public async play(
		deviceId: string,
		albumId: string,
		trackUri: string | null,
		single = false
	): Promise<void> {
		await this.api.play(
			await this.accessToken(),
			deviceId,
			albumId,
			trackUri,
			single
		);
	}

	public async setPaused(paused: boolean): Promise<void> {
		const token = await this.accessToken();
		await (paused ? this.api.pause(token) : this.api.resume(token));
	}

	public async skip(direction: 'next' | 'previous'): Promise<void> {
		const token = await this.accessToken();
		await (direction === 'next'
			? this.api.next(token)
			: this.api.previous(token));
	}

	public async seek(positionMs: number): Promise<void> {
		await this.api.seek(await this.accessToken(), positionMs);
	}

	/** Sets the volume (0–100) of a Spotify Connect device. */
	public async setVolume(
		deviceId: string,
		volumePercent: number
	): Promise<void> {
		await this.api.setVolume(
			await this.accessToken(),
			deviceId,
			volumePercent
		);
	}

	public async devices(): Promise<SpotifyDevice[]> {
		return this.api.devices(await this.accessToken());
	}

	public async transfer(deviceId: string, play: boolean): Promise<void> {
		await this.api.transfer(await this.accessToken(), deviceId, play);
	}

	public async nowPlaying(): Promise<SpotifyNowPlaying | null> {
		return this.api.nowPlaying(await this.accessToken());
	}
}
