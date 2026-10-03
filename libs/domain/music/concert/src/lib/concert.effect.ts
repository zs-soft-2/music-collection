import {
	Observable,
	combineLatest,
	map,
	shareReplay,
	startWith,
	switchMap,
	throwError,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	ConcertAiSettings,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEntity,
	ConcertRepository,
	ConcertSuggestionEntity,
	LoadConcertsInput,
	LoadConcertsResult,
	LoadVenuesResult,
	SuggestConcertsInput,
	SuggestConcertsResult,
	VenueDraft,
	VenueEntity,
	VenueRepository,
	isComingConcert,
} from '@music-collection/api';

/** A venue a concert is filed at cannot be deleted; it is retired instead. */
export const VENUE_IN_USE = 'venue-in-use';

/** The day, `YYYY-MM-DD`, as the stored concert days are written. */
export const concertDay = (now: Date = new Date()): string =>
	`${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;

/**
 * The concerts and the venues as the rest of the app asks for them.
 *
 * The lists start empty rather than pending, and they are shared rather than
 * queried again. Both for the same reason: a page that waited for a first
 * answer would wait for good if a rule or an index were missing — the sync
 * never errors, it simply never emits.
 *
 * Not `providedIn: 'root'`. Both concert pages are lazy, so the repositories
 * are bound on their routes (`provideConcert()`), and a root-provided effect
 * would look for them in the root injector, which cannot see a route's
 * providers — the page died on NG0201 before it drew anything. Living in the
 * same injector as its repositories is also what keeps the lib out of the main
 * bundle, which is why the bindings are on the route at all.
 */
@Injectable()
export class ConcertEffect {
	private readonly concerts = inject(ConcertRepository);
	private readonly venues = inject(VenueRepository);

	/** Every venue by name, the empty list until the first answer arrives. */
	public readonly venues$: Observable<VenueEntity[]> = this.venues
		.list$()
		.pipe(
			map((venues) =>
				[...venues].sort((left, right) =>
					left.name.localeCompare(right.name, 'hu')
				)
			),
			startWith([] as VenueEntity[]),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	/** What a concert form offers: the venues an admin has not retired. */
	public readonly openVenues$: Observable<VenueEntity[]> = this.venues$.pipe(
		map((venues) => venues.filter((venue) => venue.active !== false))
	);

	/** Every filed concert, soonest first. The past is dropped by the page. */
	public readonly concerts$: Observable<ConcertEntity[]> = this.concerts
		.list$()
		.pipe(
			map(sortConcerts),
			startWith([] as ConcertEntity[]),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	/**
	 * What is still to come, soonest first.
	 *
	 * The day is checked here rather than trusted from the load: the loads run
	 * daily at best, so a concert played last night is still in the collection
	 * this morning.
	 */
	public coming$(from: string = concertDay()): Observable<ConcertEntity[]> {
		return this.concerts$.pipe(
			map((concerts) =>
				concerts.filter((concert) => isComingConcert(concert, from))
			)
		);
	}

	/**
	 * The concerts with the venue they are held at, for a page that shows an
	 * address or a pin. Combined rather than read per concert: both lists are
	 * already in the cache, and a lookup per row would be a query per row.
	 */
	public comingWithVenue$(
		from: string = concertDay()
	): Observable<{ concert: ConcertEntity; venue: VenueEntity | null }[]> {
		return combineLatest([this.coming$(from), this.venues$]).pipe(
			map(([concerts, venues]) => {
				const byUid = new Map(venues.map((venue) => [venue.uid, venue]));

				return concerts.map((concert) => ({
					concert,
					venue: concert.venueUid
						? (byUid.get(concert.venueUid) ?? null)
						: null,
				}));
			})
		);
	}

	/**
	 * Every suggestion, pending and decided both — read once and shared, so the
	 * two lists below are one query rather than two over the same collection.
	 *
	 * Nothing subscribes to it until a page asks: only an admin may read this
	 * collection, and the public page must not ask for it at all.
	 */
	private readonly suggestions$: Observable<ConcertSuggestionEntity[]> =
		this.concerts
			.suggestions$()
			.pipe(shareReplay({ bufferSize: 1, refCount: false }));

	/** The suggestions waiting for an admin, the most certain first. */
	public readonly pending$: Observable<ConcertSuggestionEntity[]> =
		this.suggestions$.pipe(
			map((suggestions) =>
				suggestions
					.filter(
						(suggestion) => suggestion.reviewState === 'pending'
					)
					.sort(
						(left, right) =>
							(right.confidence ?? 0) - (left.confidence ?? 0) ||
							left.startsAt.localeCompare(right.startsAt)
					)
			),
			startWith([] as ConcertSuggestionEntity[]),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	/** The ones already turned down, so an admin can take a rejection back. */
	public readonly rejected$: Observable<ConcertSuggestionEntity[]> =
		this.suggestions$.pipe(
			map((suggestions) =>
				suggestions
					.filter(
						(suggestion) => suggestion.reviewState === 'rejected'
					)
					.sort((left, right) =>
						(right.reviewedAt ?? 0) > (left.reviewedAt ?? 0)
							? 1
							: -1
					)
			),
			startWith([] as ConcertSuggestionEntity[]),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	public create$(concert: ConcertDraft): Observable<ConcertEntity> {
		return this.concerts.create$(concert);
	}

	public update$(
		concert: ConcertEntity,
		draft: ConcertDraft
	): Observable<ConcertEntity> {
		return this.concerts.update$(concert, draft);
	}

	public delete$(concert: ConcertEntity): Observable<void> {
		return this.concerts.delete$(concert);
	}

	/** Files a suggestion, with the admin's corrections where there are any. */
	public approve$(
		suggestion: ConcertSuggestionEntity,
		draft?: ConcertDraft
	): Observable<ConcertEntity> {
		return this.concerts.approve$(suggestion, draft);
	}

	public reject$(suggestion: ConcertSuggestionEntity): Observable<void> {
		return this.concerts.reject$(suggestion);
	}

	/** Catalog artists for an act row, by the name being typed into it. */
	public searchArtists$(term: string): Observable<ConcertArtistMatch[]> {
		return this.concerts.searchArtists$(term);
	}

	public createVenue$(venue: VenueDraft): Observable<VenueEntity> {
		return this.venues.create$(venue);
	}

	public updateVenue$(
		uid: string,
		venue: VenueDraft
	): Observable<VenueEntity> {
		return this.venues.update$(uid, venue);
	}

	/**
	 * Deleting a venue is refused while a concert is filed there: those
	 * concerts would be left pointing at nothing, and nothing on the client
	 * could put the venue back. Retiring it takes it off the forms without
	 * touching what is already saved.
	 */
	public deleteVenue$(venue: VenueEntity): Observable<void> {
		return this.venues.isInUse$(venue.uid).pipe(
			switchMap((inUse) =>
				inUse
					? throwError(() => new Error(VENUE_IN_USE))
					: this.venues.delete$(venue)
			)
		);
	}

	public loadVenues$(countryCode: string): Observable<LoadVenuesResult> {
		return this.venues.load$(countryCode);
	}

	public loadConcerts$(
		input: LoadConcertsInput
	): Observable<LoadConcertsResult> {
		return this.concerts.load$(input);
	}

	public suggestConcerts$(
		input: SuggestConcertsInput
	): Observable<SuggestConcertsResult> {
		return this.concerts.suggest$(input);
	}

	public readAiSettings$(): Observable<ConcertAiSettings> {
		return this.concerts.readSettings$();
	}

	public writeAiSettings$(
		settings: ConcertAiSettings
	): Observable<ConcertAiSettings> {
		return this.concerts.writeSettings$(settings);
	}
}

/** Soonest first; a day's concerts by artist, so the order is not arbitrary. */
export function sortConcerts(concerts: ConcertEntity[]): ConcertEntity[] {
	return [...concerts].sort(
		(left, right) =>
			left.startsAt.localeCompare(right.startsAt) ||
			(left.startsAtTime ?? '').localeCompare(right.startsAtTime ?? '') ||
			left.artistName.localeCompare(right.artistName, 'hu')
	);
}
