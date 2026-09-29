import { Observable } from 'rxjs';

import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, inject } from '@angular/core';
import {
	CatalogScopeService,
	FirestoreSyncService,
	GenreEntity,
	genreScopeKey,
} from '@music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';

import { UserSettingsEffect } from '../user-settings';

import { GENRE_SCOPE_SETTING } from './genre-scope.model';

/**
 * Changing which genres the collector follows.
 *
 * Reading the scope is cheap and happens everywhere; changing it is neither,
 * which is why it lives here rather than on the setting. A narrower catalog
 * means the browser is holding records it may no longer show, so the change
 * takes the local catalog with it and starts the app again on the new one.
 */
@Injectable({ providedIn: 'root' })
export class GenreScopeEffect {
	private readonly scope = inject(CatalogScopeService);
	private readonly sync = inject(FirestoreSyncService);
	private readonly settings = inject(UserSettingsEffect);
	private readonly genres = inject(GenreEffect);
	private readonly document = inject(DOCUMENT);

	/** The genres followed, by slug. */
	public readonly slugs: Signal<string[]> = this.scope.slugs;

	/** The genres to pick from: the ones an admin has not retired. */
	public genres$(): Observable<GenreEntity[]> {
		return this.genres.genres$;
	}

	/**
	 * Follows these genres from now on.
	 *
	 * The order is the whole point. The choice is written to the account
	 * first, because that is the record of it; then this browser's catalog
	 * is thrown away, because it holds genres that are no longer followed;
	 * and only then does the page start again, on a cache it will refill
	 * from the bundles of the genres chosen. Reloading before the write
	 * would lose the choice, and reloading before the cache is cleared would
	 * leave the old genres to be read out of it.
	 */
	public async apply(slugs: string[]): Promise<void> {
		if (genreScopeKey(slugs) === genreScopeKey(this.scope.slugs())) {
			return;
		}

		await this.settings.save(GENRE_SCOPE_SETTING, { genres: slugs });
		this.scope.choose(slugs);

		await this.sync.resetLocalCatalog();
		this.document.defaultView?.location.reload();
	}
}
