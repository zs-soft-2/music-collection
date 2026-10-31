import { of, switchMap } from 'rxjs';

import { Injectable, type Signal, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	AuthenticatedUserService,
	CatalogScopeService,
	genreScopeKey,
} from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';

import { GENRE_SCOPE_SETTING, GenreScopeSettings } from './genre-scope.model';

/**
 * Ties the followed genres to the account: the collector who picked jazz on
 * their laptop gets jazz on their phone, rather than the whole catalog.
 *
 * The choice itself stays owned by `CatalogScopeService` — it has to be in
 * place before the first catalog query, which is long before Firestore
 * answers — and this only carries it to and from the account. The same
 * division as `LanguageSyncService`, for the same reason.
 *
 * It will not invent a choice: an account with no scope means the collector
 * has not narrowed anything, and writing this browser's empty scope back
 * would be indistinguishable from them choosing the whole catalog.
 *
 * Only an account is listened to. Signed out there is no choice to carry —
 * a guest gets the showcase — and the genres this browser kept for its
 * guest must not become the next account's.
 */
@Injectable({ providedIn: 'root' })
export class GenreScopeSyncService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly scope = inject(CatalogScopeService);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly answeredState = signal(false);

	/**
	 * What the account holds, so applying it does not save it straight back.
	 * Null until the first value arrives — until then this browser's scope
	 * must not overwrite the account's.
	 */
	private stored: GenreScopeSettings | null = null;

	/**
	 * Whether the signed-in account has said what it follows, so that an
	 * empty scope is the collector's and not merely the account still
	 * loading — what asking them to choose waits for.
	 */
	public readonly answered: Signal<boolean> = this.answeredState.asReadonly();

	public constructor() {
		this.authenticatedUser.user$
			.pipe(
				switchMap((user) =>
					user ? this.settings.value$(GENRE_SCOPE_SETTING) : of(null)
				),
				takeUntilDestroyed()
			)
			.subscribe((settings) => this.apply(settings));

		effect(() => {
			const genres = this.scope.slugs();

			// Only once the account has answered: before that there is
			// nothing to compare against, and this browser's scope would be
			// written over one the collector set elsewhere.
			if (
				!this.stored ||
				genreScopeKey(this.stored.genres ?? []) ===
					genreScopeKey(genres)
			) {
				return;
			}

			this.persist({ genres });
		});
	}

	private apply(settings: GenreScopeSettings | null): void {
		this.stored = settings;
		this.answeredState.set(!!settings);

		if (!settings) {
			return;
		}

		// An account that has never said leaves this browser's scope alone;
		// an account that says "all of it" is a choice like any other.
		if (settings.genres) {
			this.scope.choose(settings.genres);
		}
	}

	private persist(settings: GenreScopeSettings): void {
		this.stored = settings;

		this.settings.save(GENRE_SCOPE_SETTING, settings).catch((error) => {
			console.error('Genre scope not saved', error);
		});
	}
}
