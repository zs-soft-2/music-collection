import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { EXTERNAL_PLAYER_SETTING } from './external-player.setting';

/**
 * Whether the outside players — YouTube's embed and Spotify's — may be put on
 * the page. They are not ours: the moment one is embedded it writes its own
 * storage and reports the visit home, which the app cannot undo afterwards.
 * So it takes two things, and this is the only place that decides.
 */
@Injectable({ providedIn: 'root' })
export class ExternalPlayerConsentService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly authenticatedUser = inject(AuthenticatedUserService);

	/** Null while the question has not been answered (or not loaded yet). */
	public readonly consented = signal<boolean | null>(null);
	private readonly signedIn = signal(false);

	/**
	 * Listening is for collectors. A guest gets no player whatever they
	 * answer: an outside player is the one thing on the page that reports the
	 * visit to somebody else, and a visitor who has not signed in has not
	 * asked us for anything that needs it.
	 */
	public readonly allowed = computed(
		() => this.signedIn() && this.consented() === true
	);

	/** Worth asking only where the answer could change something. */
	public readonly asking = computed(
		() => this.signedIn() && this.consented() === null
	);

	public constructor() {
		this.settings
			.value$(EXTERNAL_PLAYER_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe(({ consented }) => this.consented.set(consented));

		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));
	}

	/**
	 * Records the answer. The signal moves first: a withdrawal has to take
	 * the players off the page now, not once the account has the change.
	 */
	public decide(consented: boolean): void {
		this.consented.set(consented);

		this.settings
			.save(EXTERNAL_PLAYER_SETTING, { consented })
			.catch((error) => {
				console.error('External player consent not saved', error);
			});
	}
}
