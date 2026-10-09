import { Observable, of } from 'rxjs';

import { Provider } from '@angular/core';
import {
	ACT_SEARCH_LENGTH,
	ConcertAiSettings,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEntity,
	ConcertRepository,
	ConcertSuggestionEntity,
	EntityTypeEnum,
	DEFAULT_CONCERT_AI_SETTINGS,
	LoadConcertsResult,
	LoadVenuesResult,
	SuggestConcertsResult,
	SuggestVenuesResult,
	VenueDraft,
	VenueEntity,
	VenueRepository,
	VenueSuggestionEntity,
	VenueUsage,
	toConcertId,
	toVenueSlug,
} from '@music-collection/api';

import { ConcertEffect } from './concert.effect';

/** A concert as a test needs it: a band, a day and a place. */
export function concertOf(
	overrides: Partial<ConcertEntity> = {}
): ConcertEntity {
	const base = {
		artistImageUrl: null,
		artistName: 'Tankcsapda',
		artistUid: 'artist-tank',
		cancelled: false,
		city: 'Budapest',
		countryCode: 'HU',
		endsAt: null,
		entityType: EntityTypeEnum.Concert,
		eventType: 'concert' as const,
		matchedBy: 'musicBrainzId' as const,
		musicBrainzArtistIds: [],
		musicBrainzEventId: null,
		source: 'musicbrainz' as const,
		sourceUrl: null,
		startsAt: '2026-11-12',
		startsAtTime: null,
		supportingActs: [],
		ticketUrl: null,
		title: 'Tankcsapda a Parkban',
		venueName: 'Budapest Park',
		venueUid: 'mbid-park',
		...overrides,
	};

	return {
		...base,
		uid:
			overrides.uid ??
			toConcertId(base.artistUid, base.startsAt, base.venueName),
	};
}

/** A suggestion as a test needs it: a concert, pending a decision. */
export function suggestionOf(
	overrides: Partial<ConcertSuggestionEntity> = {}
): ConcertSuggestionEntity {
	return {
		...concertOf(overrides as Partial<ConcertEntity>),
		confidence: 0.8,
		matchedBy: 'name',
		model: 'gemini-2.5-flash',
		note: null,
		reviewState: 'pending',
		reviewedAt: null,
		reviewedBy: null,
		source: 'ai',
		suggestedAt: 1_760_000_000_000,
		...overrides,
	};
}

export function venueOf(overrides: Partial<VenueEntity> = {}): VenueEntity {
	const name = overrides.name ?? 'Budapest Park';
	const city = overrides.city ?? 'Budapest';

	return {
		active: true,
		address: null,
		city,
		closedAt: null,
		coordinates: null,
		countryCode: 'HU',
		entityType: EntityTypeEnum.Venue,
		musicBrainzId: null,
		name,
		source: 'manual',
		type: 'Venue',
		uid: overrides.uid ?? toVenueSlug(name, city),
		...overrides,
	};
}

/** A venue proposal as a test needs it: a place the model named, waiting. */
export function venueSuggestionOf(
	overrides: Partial<VenueSuggestionEntity> = {}
): VenueSuggestionEntity {
	return {
		...venueOf(overrides as Partial<VenueEntity>),
		confidence: 0.8,
		model: 'gemini-2.5-flash',
		note: null,
		reviewState: 'pending',
		reviewedAt: null,
		reviewedBy: null,
		source: 'ai',
		sourceUrl: 'https://example.test/venue',
		suggestedAt: 1_760_000_000_000,
		...overrides,
	};
}

const EMPTY_VENUE_LOAD: LoadVenuesResult = {
	scanned: 0,
	venues: 0,
	written: 0,
	unchanged: 0,
};

const EMPTY_CONCERT_LOAD: LoadConcertsResult = {
	artistsQueried: 0,
	eventsScanned: 0,
	matched: 0,
	written: 0,
	deleted: 0,
	venuesCreated: 0,
};

const EMPTY_SUGGEST: SuggestConcertsResult = {
	venuesQueried: 0,
	concertsSeen: 0,
	proposed: 0,
	suggested: 0,
	duplicates: 0,
	rejected: 0,
	discarded: 0,
	model: 'gemini-2.5-flash',
	requestsUsed: 0,
	requestsLeft: 50,
};

const EMPTY_VENUE_SUGGEST: SuggestVenuesResult = {
	asked: 0,
	venuesSeen: 0,
	suggested: 0,
	duplicates: 0,
	rejected: 0,
	discarded: 0,
	model: 'gemini-2.5-flash',
	requestsUsed: 0,
	requestsLeft: 50,
};

/**
 * The concerts a test runs against, in memory. Everything that reads a concert
 * goes through these two contracts, so this is all a test has to provide — and
 * the lists it names are the whole world as far as that test is concerned.
 */
export function provideConcertTesting(
	concerts: ConcertEntity[] = [],
	venues: VenueEntity[] = [],
	suggestions: ConcertSuggestionEntity[] = [],
	artists: ConcertArtistMatch[] = [],
	venueSuggestions: VenueSuggestionEntity[] = []
): Provider[] {
	return [
		// Az effect itt is a listában áll, mint élesben: nem gyökér-szolgáltatás,
		// hanem a feature injektoráé.
		ConcertEffect,
		{
			provide: ConcertRepository,
			useValue: {
				list$: (): Observable<ConcertEntity[]> => of(concerts),
				suggestions$: (): Observable<ConcertSuggestionEntity[]> =>
					of(suggestions),
				create$: (concert: ConcertDraft): Observable<ConcertEntity> =>
					of(concertOf(concert as Partial<ConcertEntity>)),
				update$: (
					concert: ConcertEntity,
					draft: ConcertDraft
				): Observable<ConcertEntity> => of({ ...concert, ...draft }),
				delete$: (): Observable<void> => of(undefined),
				approve$: (
					suggestion: ConcertSuggestionEntity
				): Observable<ConcertEntity> =>
					of(concertOf(suggestion as Partial<ConcertEntity>)),
				reject$: (): Observable<void> => of(undefined),
				searchArtists$: (
					term: string
				): Observable<ConcertArtistMatch[]> => {
					const prefix = term.trim().toLowerCase();

					return of(
						prefix.length < ACT_SEARCH_LENGTH
							? []
							: artists.filter((artist) =>
									artist.name.toLowerCase().startsWith(prefix)
								)
					);
				},
				load$: (): Observable<LoadConcertsResult> =>
					of(EMPTY_CONCERT_LOAD),
				suggest$: (): Observable<SuggestConcertsResult> =>
					of(EMPTY_SUGGEST),
				readSettings$: (): Observable<ConcertAiSettings> =>
					of(DEFAULT_CONCERT_AI_SETTINGS),
				writeSettings$: (
					settings: ConcertAiSettings
				): Observable<ConcertAiSettings> => of(settings),
			},
		},
		{
			provide: VenueRepository,
			useValue: {
				list$: (): Observable<VenueEntity[]> => of(venues),
				suggestions$: (): Observable<VenueSuggestionEntity[]> =>
					of(venueSuggestions),
				create$: (venue: VenueDraft): Observable<VenueEntity> =>
					of(venueOf(venue as Partial<VenueEntity>)),
				update$: (
					venue: VenueEntity,
					draft: VenueDraft
				): Observable<VenueEntity> => of({ ...venue, ...draft }),
				retire$: (): Observable<void> => of(undefined),
				delete$: (): Observable<void> => of(undefined),
				usage$: (uid: string): Observable<VenueUsage> =>
					of({
						concerts: concerts.filter(
							(concert) => concert.venueUid === uid
						).length,
					}),
				// A `null` (meg nem számolható) eset a store tesztjeiben áll,
				// ahol a repository helyén egy mock ül.
				load$: (): Observable<LoadVenuesResult> => of(EMPTY_VENUE_LOAD),
				suggest$: (): Observable<SuggestVenuesResult> =>
					of(EMPTY_VENUE_SUGGEST),
				approveSuggestion$: (
					suggestion: VenueSuggestionEntity
				): Observable<VenueEntity> =>
					of(venueOf(suggestion as Partial<VenueEntity>)),
				rejectSuggestion$: (): Observable<void> => of(undefined),
			},
		},
	];
}
