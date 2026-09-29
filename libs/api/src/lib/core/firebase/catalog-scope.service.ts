import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';

import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * How many genres a collector may follow at once.
 *
 * Two, because the number is a budget rather than a taste: every genre in
 * the scope is a bundle the browser downloads and a slice of the catalog it
 * keeps. One is what most collectors are here for, two covers the one who
 * collects jazz and buys punk on the side, and beyond that the download
 * creeps back towards the whole catalog the setting exists to avoid.
 */
export const GENRE_SCOPE_LIMIT = 2;

/** Where the scope is kept in this browser; see `readStored`. */
const STORAGE_KEY = 'mc-genre-scope';

/**
 * The catalog features a genre bundle carries, and so the only ones a
 * narrowed scope changes anything for.
 *
 * They are here rather than derived because membership in a genre is not a
 * field on most of them: a track belongs to its album's genre, a membership
 * and a musician to the bands they played in. `tools/sync/build-bundles.mjs`
 * works that out when it builds the bundle, so the client only has to know
 * which features arrive in one.
 *
 * Everything else — labels, releases, documents, the taxonomy itself, and
 * anything under `user/{uid}` — is downloaded as it always was. Those are
 * either small or the collector's own, and narrowing them would save
 * nothing while risking a page that cannot draw itself.
 */
export const GENRE_SCOPED_FEATURES: readonly string[] = [
	'artist',
	'album',
	'musician',
	'track',
	'membership',
	'contribution',
];

/** Whether a narrowed scope has anything to say about this feature. */
export function isGenreScoped(featureKey: string): boolean {
	return GENRE_SCOPED_FEATURES.includes(featureKey);
}

/** The scope's identity; order must not make two equal scopes differ. */
export function genreScopeKey(slugs: readonly string[]): string {
	return [...slugs].sort().join(',');
}

/**
 * Which genres of the catalog this browser downloads, by their slugs
 * (`rock`, `folk-world-country`) — the stable key a genre keeps when an
 * admin corrects its name, and the one that names its bundle.
 *
 * It owns the choice the way `LanguageService` owns the language, and for
 * the same reason: the first catalog query runs while Firestore is still
 * restoring the session, and a scope arriving a moment later would have let
 * that query download the whole catalog first — the one thing the setting
 * exists to prevent. So it is read back synchronously from this browser, and
 * the account only confirms or corrects it afterwards
 * (`GenreScopeSyncService`).
 *
 * An empty scope means the whole catalog, deliberately: that is what an
 * administrator working the catalog needs, what a collector who has not
 * chosen yet gets, and what every client did before this setting existed.
 *
 * It holds no data layer of its own, because `FirestoreSyncService` asks it
 * what to download: anything it injected from there would be injected back
 * into itself.
 */
@Injectable({ providedIn: 'root' })
export class CatalogScopeService {
	private readonly state = signal<string[]>(this.readStored());
	/**
	 * The same value as a stream. A subject rather than `toObservable`,
	 * because the sync layer subscribes to this before the first catalog
	 * query: a signal turned into a stream first emits when effects run,
	 * and a query that started in the meantime would have gone by an empty
	 * scope — which is to say, by the whole catalog.
	 */
	private readonly changes = new BehaviorSubject<string[]>(this.state());

	/** The genre slugs followed, at most `GENRE_SCOPE_LIMIT`; empty is all. */
	public readonly slugs: Signal<string[]> = this.state.asReadonly();

	/** Whether the catalog is narrowed at all. */
	public readonly narrowed: Signal<boolean> = computed(
		() => this.state().length > 0
	);

	/**
	 * The scope as a stream: changing it invalidates every cached catalog
	 * list, so the sync layer has to be able to resubscribe on it rather
	 * than read it once at startup.
	 */
	public readonly scope$: Observable<string[]> = this.changes.pipe(
		distinctUntilChanged(
			(previous, current) =>
				genreScopeKey(previous) === genreScopeKey(current)
		)
	);

	/**
	 * The collector picked, here or on another machine. Written through at
	 * once rather than from an effect: somebody who chooses a genre and
	 * closes the tab in the same breath has still chosen it, and the next
	 * start must download that genre rather than the catalog.
	 */
	public choose(slugs: string[]): void {
		const kept = slugs.filter((slug) => !!slug).slice(0, GENRE_SCOPE_LIMIT);

		if (genreScopeKey(kept) === genreScopeKey(this.state())) {
			return;
		}

		this.state.set(kept);
		this.changes.next(kept);
		this.write(kept);
	}

	/**
	 * What this browser was last set to, tolerant of anything that is not
	 * what we wrote: a scope that cannot be read is an unnarrowed catalog,
	 * which is slower but never wrong.
	 */
	private readStored(): string[] {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const stored: unknown = raw ? JSON.parse(raw)?.genres : null;

			return Array.isArray(stored)
				? stored
						.filter(
							(slug): slug is string => typeof slug === 'string'
						)
						.slice(0, GENRE_SCOPE_LIMIT)
				: [];
		} catch {
			return [];
		}
	}

	private write(genres: string[]): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ genres }));
		} catch {
			// Storage unavailable (e.g. private window): lasts the session.
		}
	}
}
