import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { SpotifyToken } from './spotify.model';
import {
	LEGACY_TOKEN_KEY,
	SPOTIFY_ACCOUNT_SETTING,
	SpotifyConnection,
} from './spotify-account.setting';

/**
 * The collector's Spotify app and their connection to it, and the only place
 * either is held. Both hang on the account rather than on the browser: the
 * app is registered in their own Spotify dashboard and full playback needs
 * their own Premium, so app and connection are as personal as the
 * subscription behind them, and both are managed where the rest of the
 * account is — the profile.
 *
 * Signed out there is no app and no connection, whatever any storage holds.
 */
@Injectable({ providedIn: 'root' })
export class SpotifyAccountService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly authenticatedUser = inject(AuthenticatedUserService);

	private readonly stored = signal<SpotifyConnection>(null);
	private readonly signedIn = signal(false);

	/** The app and connection of whoever is signed in, or none. */
	public readonly account = computed<SpotifyConnection>(() =>
		this.signedIn() ? this.stored() : null
	);

	/** The collector's own Spotify app, once they have named one. */
	public readonly clientId = computed(() => this.account()?.clientId ?? null);

	/** The connection made with that app, while there is one. */
	public readonly token = computed(() => this.account()?.token ?? null);

	private settle: (() => void) | null = null;
	/**
	 * Resolves once the account has answered at least once. The browser copy
	 * used to be there the instant it was asked for; a document is not, and a
	 * player that starts before the answer would decide there is no app.
	 */
	private readonly settled = new Promise<void>((resolve) => {
		this.settle = resolve;
	});

	public constructor() {
		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));

		this.settings
			.value$(SPOTIFY_ACCOUNT_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe((account) => {
				this.stored.set(account);
				this.settle?.();
				this.settle = null;
			});

		this.dropLegacyToken();
	}

	public ready(): Promise<void> {
		return this.settled;
	}

	/**
	 * Names the collector's own Spotify app; an empty id forgets it. Pointing
	 * them at another app ends the connection rather than carrying over a
	 * refresh token the new app has no right to refresh.
	 */
	public saveApp(clientId: string): Promise<void> {
		const wanted = clientId.trim();

		if (!wanted) {
			return this.write(null);
		}

		return this.write({
			clientId: wanted,
			token: this.clientId() === wanted ? this.token() : null,
		});
	}

	/** Keeps what the sign-in came back with, under the app that asked. */
	public saveConnection(
		clientId: string,
		token: SpotifyToken
	): Promise<void> {
		return this.write({ clientId, token });
	}

	/** Ends the connection; the app stays named, ready to connect again. */
	public clearToken(): Promise<void> {
		const clientId = this.clientId();

		return this.write(clientId ? { clientId, token: null } : null);
	}

	private write(account: SpotifyConnection): Promise<void> {
		this.stored.set(account);

		return this.settings.save(SPOTIFY_ACCOUNT_SETTING, account);
	}

	/**
	 * Takes away the connection from before the apps were the collectors'
	 * own. It was made with the one app everybody shared, so there is nothing
	 * in it their own app could refresh — and a browser nobody signs into
	 * has no use for it either.
	 */
	private dropLegacyToken(): void {
		try {
			localStorage.removeItem(LEGACY_TOKEN_KEY);
		} catch {
			// Storage unavailable: the stale copy is unread either way.
		}
	}
}
