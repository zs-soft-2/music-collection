import { Observable } from 'rxjs';

import { DOCUMENT } from '@angular/common';
import { Injectable, type Signal, computed, inject } from '@angular/core';
import {
	CatalogScopeService,
	CatalogSessionService,
	GenreEntity,
	genreScopeKey,
} from '@music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';

import { UserSettingsEffect } from '../user-settings';

import { GenreScopeSyncService } from './genre-scope-sync.service';
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
	private readonly session = inject(CatalogSessionService);
	private readonly account = inject(GenreScopeSyncService);
	private readonly settings = inject(UserSettingsEffect);
	private readonly genres = inject(GenreEffect);
	private readonly document = inject(DOCUMENT);

	/** The genres followed, by slug. */
	public readonly slugs: Signal<string[]> = this.scope.slugs;

	/** Whether a signed-in collector's catalog is narrowed to their genres. */
	public readonly narrowed: Signal<boolean> = this.scope.narrowed;

	/**
	 * Whether following no genre gives this reader the whole catalog — an
	 * administrator — rather than the weekly showcase.
	 */
	public readonly wholeCatalog: Signal<boolean> = this.scope.whole;

	/**
	 * A collector signed in and following no genre, who is asked to choose
	 * one before being shown anything: the showcase is a guest's, and what
	 * a collector sees is what they are here for.
	 *
	 * Only once the account and the roles have both answered — before that
	 * an empty scope may be a choice still on its way, or an administrator
	 * not yet known to be one.
	 */
	public readonly needsChoice: Signal<boolean> = computed(
		() =>
			this.scope.signedIn() &&
			this.scope.rolesKnown() &&
			this.account.answered() &&
			!this.scope.narrowed() &&
			!this.scope.whole()
	);

	/** The genres to pick from: the ones an admin has not retired. */
	public genres$(): Observable<GenreEntity[]> {
		return this.genres.genres$;
	}

	/**
	 * Follows these genres from now on.
	 *
	 * The order is the whole point. The choice is written to the account
	 * first, because that is the record of it; only then does the scope
	 * change, and with it `CatalogSessionService` throws away this
	 * browser's catalog — it holds genres that are no longer followed — and
	 * starts the page again on a cache it will refill from the bundles of
	 * the genres chosen. Reloading before the write would lose the choice.
	 * Going to the whole catalog keeps the cache, which holds part of it
	 * already, so the page is only started again.
	 */
	public async apply(slugs: string[]): Promise<void> {
		if (genreScopeKey(slugs) === genreScopeKey(this.scope.slugs())) {
			return;
		}

		await this.settings.save(GENRE_SCOPE_SETTING, { genres: slugs });
		this.scope.choose(slugs);

		if (!this.session.restarting) {
			this.document.defaultView?.location.reload();
		}
	}
}
