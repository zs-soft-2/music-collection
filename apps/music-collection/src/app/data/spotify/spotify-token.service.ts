import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { SpotifyToken } from './spotify.model';
import {
	LEGACY_TOKEN_KEY,
	SPOTIFY_TOKEN_SETTING,
	SpotifyConnection,
} from './spotify-token.setting';

/**
 * The collector's Spotify connection, and the only place it is held. It hangs
 * on the account rather than on the browser: full playback needs their own
 * Spotify Premium, so the connection is as personal as the subscription
 * behind it, and it is managed where the rest of the account is — the profile.
 *
 * Signed out there is no connection at all, whatever any storage still holds.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyTokenService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly authenticatedUser = inject(AuthenticatedUserService);

	private readonly stored = signal<SpotifyConnection>(null);
	private readonly signedIn = signal(false);

	/** The connection of whoever is signed in, or none. */
	public readonly token = computed<SpotifyConnection>(() =>
		this.signedIn() ? this.stored() : null
	);

	private settle: (() => void) | null = null;
	/**
	 * Resolves once the account has answered at least once. The browser copy
	 * used to be there the instant it was asked for; a document is not, and a
	 * player that starts before the answer would decide it is not connected.
	 */
	private readonly settled = new Promise<void>((resolve) => {
		this.settle = resolve;
	});

	public constructor() {
		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));

		this.settings
			.value$(SPOTIFY_TOKEN_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe((connection) => {
				this.stored.set(connection);
				this.settle?.();
				this.settle = null;
				this.carryOverLegacy(connection);
			});
	}

	public ready(): Promise<void> {
		return this.settled;
	}

	public save(token: SpotifyToken): Promise<void> {
		this.stored.set(token);

		return this.settings.save(SPOTIFY_TOKEN_SETTING, token);
	}

	public clear(): Promise<void> {
		this.stored.set(null);

		return this.settings.save(SPOTIFY_TOKEN_SETTING, null);
	}

	/**
	 * Moves a connection made before it hung on the account into the account
	 * of whoever is signed in now, and takes the browser's copy away either
	 * way. A browser nobody signs into keeps its stale copy, unused: removing
	 * it there would end the connection of the collector it belongs to before
	 * they ever came back for it.
	 */
	private carryOverLegacy(connection: SpotifyConnection): void {
		if (!this.authenticatedUser.current) {
			return;
		}

		try {
			const stored = localStorage.getItem(LEGACY_TOKEN_KEY);

			if (!stored) {
				return;
			}

			localStorage.removeItem(LEGACY_TOKEN_KEY);

			if (connection) {
				return;
			}

			const legacy = JSON.parse(stored) as SpotifyToken;

			if (legacy?.refreshToken) {
				void this.save(legacy).catch((error) => {
					console.error('Spotify connection not carried over', error);
				});
			}
		} catch {
			// Storage unavailable, or nonsense in it: reconnecting is the
			// worst that follows, and the profile is where that is done.
		}
	}
}
