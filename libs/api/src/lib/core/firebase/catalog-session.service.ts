import { distinctUntilChanged, map } from 'rxjs';

import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from './authenticated-user.service';
import { CatalogScopeService, catalogScopeKey } from './catalog-scope.service';
import { FirestoreSyncService } from './firestore-sync.service';

/** Where this browser remembers which scope its local catalog was filled by. */
const HELD_STORAGE_KEY = 'mc-catalog-held-scope';

/** The key of the whole catalog: it holds every other scope. */
const WHOLE_SCOPE_KEY = '';

/**
 * Keeps this browser's catalog to the scope in force.
 *
 * Two things change the scope without anybody pressing apply: signing in,
 * which brings the account's genres, and signing out, which hands the
 * browser back to a guest. Each leaves the local cache holding records the
 * new scope does not include — the showcase's other genres under a rock
 * collector, a collector's genres under the guest after them — and a cached
 * query answers with whatever is there. So this tells the scope who is
 * signed in, and whenever the scope moves to one the cache was not filled
 * by, it throws the local catalog away and starts the app again on the new
 * one, as choosing genres on the profile always has.
 *
 * The whole catalog is the one move that needs none of that: it holds every
 * other scope, so nothing in the cache is out of it.
 *
 * It remembers the scope the cache was filled by in this browser rather than
 * comparing with the last one it saw, so a scope that changed while the app
 * was closed — a session that expired — is caught on the next start too.
 */
@Injectable({ providedIn: 'root' })
export class CatalogSessionService {
	private readonly scope = inject(CatalogScopeService);
	private readonly sync = inject(FirestoreSyncService);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly document = inject(DOCUMENT);
	private resetting = false;

	/**
	 * Whether the local catalog is being thrown away and the app is about
	 * to start again: a caller that changed the scope need not restart it.
	 */
	public get restarting(): boolean {
		return this.resetting;
	}

	public constructor() {
		this.authenticatedUser.user$
			.pipe(
				map((user) => !!user),
				distinctUntilChanged(),
				takeUntilDestroyed()
			)
			.subscribe((signedIn) => this.scope.useSession(signedIn));

		this.scope.scope$
			.pipe(
				map((scope) => catalogScopeKey(scope)),
				takeUntilDestroyed()
			)
			.subscribe((key) => this.follow(key));
	}

	private follow(key: string): void {
		const held = this.readHeld();

		if (held === key || this.resetting) {
			return;
		}

		// Nothing recorded yet is a cache filled before this was kept, by
		// the scope it was opened in; the whole catalog holds the rest.
		if (held === null || key === WHOLE_SCOPE_KEY) {
			this.writeHeld(key);

			return;
		}

		this.resetting = true;
		// Written before the reset, not after: a reset that fails must not
		// send every start after it round the same reload again.
		this.writeHeld(key);

		this.sync
			.resetLocalCatalog()
			.catch((error) => console.error('Local catalog not reset', error))
			.finally(() => this.document.defaultView?.location.reload());
	}

	private readHeld(): string | null {
		try {
			return localStorage.getItem(HELD_STORAGE_KEY);
		} catch {
			return null;
		}
	}

	private writeHeld(key: string): void {
		try {
			localStorage.setItem(HELD_STORAGE_KEY, key);
		} catch {
			// Storage unavailable (e.g. private window): the cache lasts the
			// session as well, so there is nothing to keep it apart from.
		}
	}
}
