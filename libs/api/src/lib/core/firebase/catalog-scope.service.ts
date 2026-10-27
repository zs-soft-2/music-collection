import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';

import { Injectable, type Signal, computed, signal } from '@angular/core';

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

/** Where this browser remembers that it serves an administrator. */
const WHOLE_STORAGE_KEY = 'mc-catalog-whole';

/**
 * The scope of a reader who follows no genre and is not an administrator:
 * the showcase (`sync/catalog.guestBundle`, built by `composeGuestBundle` in
 * apps/functions). Not a slug any genre could have, so it can stand where a
 * scope key does without ever meaning a genre.
 */
export const GUEST_SCOPE_KEY = '@guest';

/**
 * What this browser downloads of the catalog: the genres followed, or —
 * where there are none — the showcase for a guest and the whole catalog for
 * an administrator.
 */
export interface CatalogScope {
	genres: string[];
	/** Following no genre and not an administrator: the showcase. */
	guest: boolean;
}

/** The scope's identity: what tells its cache bookkeeping from another's. */
export function catalogScopeKey(scope: CatalogScope): string {
	return scope.genres.length
		? genreScopeKey(scope.genres)
		: scope.guest
			? GUEST_SCOPE_KEY
			: '';
}

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
 * Following no genre means the showcase — a few collections of every genre
 * with their albums and artists, a fraction of the catalog — for a guest and
 * for a collector who has not chosen yet. An administrator working the
 * catalog gets the whole of it instead (`useWholeCatalog`). Where no showcase
 * is published the sync layer falls back to the whole catalog, which is what
 * every client did before either existed.
 *
 * It holds no data layer of its own, because `FirestoreSyncService` asks it
 * what to download: anything it injected from there would be injected back
 * into itself.
 */
@Injectable({ providedIn: 'root' })
export class CatalogScopeService {
	private readonly state = signal<string[]>(this.readStored());
	private readonly wholeState = signal<boolean>(this.readWhole());
	/**
	 * The same value as a stream. A subject rather than `toObservable`,
	 * because the sync layer subscribes to this before the first catalog
	 * query: a signal turned into a stream first emits when effects run,
	 * and a query that started in the meantime would have gone by the
	 * wrong scope — the whole catalog, or the showcase in place of a genre.
	 */
	private readonly changes = new BehaviorSubject<CatalogScope>(
		this.current()
	);

	/** The genre slugs followed, at most `GENRE_SCOPE_LIMIT`; empty is all. */
	public readonly slugs: Signal<string[]> = this.state.asReadonly();

	/** Whether the catalog is narrowed to genres. */
	public readonly narrowed: Signal<boolean> = computed(
		() => this.state().length > 0
	);

	/** Whether this browser serves an administrator, who gets everything. */
	public readonly whole: Signal<boolean> = this.wholeState.asReadonly();

	/** The key of the scope in force; see `catalogScopeKey`. */
	public readonly key: Signal<string> = computed(() =>
		catalogScopeKey({
			genres: this.state(),
			guest: !this.wholeState(),
		})
	);

	/**
	 * The scope as a stream: changing it invalidates every cached catalog
	 * list, so the sync layer has to be able to resubscribe on it rather
	 * than read it once at startup.
	 */
	public readonly scope$: Observable<CatalogScope> = this.changes.pipe(
		distinctUntilChanged(
			(previous, current) =>
				catalogScopeKey(previous) === catalogScopeKey(current)
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
		this.changes.next(this.current());
		this.write(kept);
	}

	/**
	 * Whether the reader is an administrator, who works on the whole
	 * catalog where a collector following no genre gets the showcase.
	 *
	 * Remembered in this browser for the same reason the genres are: the
	 * first catalog query runs before the roles have arrived, and an
	 * administrator's page would otherwise start on the showcase and then
	 * load everything on top of it. Going from the showcase to the whole
	 * catalog needs no cache reset — the whole holds the showcase.
	 */
	public useWholeCatalog(whole: boolean): void {
		if (whole === this.wholeState()) {
			return;
		}

		this.wholeState.set(whole);
		this.changes.next(this.current());

		try {
			if (whole) {
				localStorage.setItem(WHOLE_STORAGE_KEY, 'true');
			} else {
				localStorage.removeItem(WHOLE_STORAGE_KEY);
			}
		} catch {
			// Storage unavailable (e.g. private window): lasts the session.
		}
	}

	private current(): CatalogScope {
		return { genres: this.state(), guest: !this.wholeState() };
	}

	private readWhole(): boolean {
		try {
			return localStorage.getItem(WHOLE_STORAGE_KEY) === 'true';
		} catch {
			return false;
		}
	}

	/**
	 * What this browser was last set to, tolerant of anything that is not
	 * what we wrote: a scope that cannot be read is no genre at all — the
	 * showcase, which the collector can narrow again from their profile.
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
