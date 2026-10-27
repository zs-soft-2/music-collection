import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogScopeService, genreScopeKey } from '@music-collection/api';

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
 */
@Injectable({ providedIn: 'root' })
export class GenreScopeSyncService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly scope = inject(CatalogScopeService);

	/**
	 * What the account holds, so applying it does not save it straight back.
	 * Null until the first value arrives — until then this browser's scope
	 * must not overwrite the account's.
	 */
	private stored: GenreScopeSettings | null = null;

	public constructor() {
		this.settings
			.value$(GENRE_SCOPE_SETTING)
			.pipe(takeUntilDestroyed())
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

	private apply(settings: GenreScopeSettings): void {
		this.stored = settings;

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
