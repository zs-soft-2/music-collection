import {
	catchError,
	exhaustMap,
	forkJoin,
	map,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	ACT_SEARCH_LENGTH,
	CONCERT_WINDOW_DAYS,
	ConcertAct,
	ConcertAiSettings,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEntity,
	ConcertSuggestionEntity,
	DEFAULT_CONCERT_COUNTRY,
	DEFAULT_CONCERT_AI_SETTINGS,
	LoadConcertsResult,
	LoadVenuesResult,
	SuggestConcertsResult,
	SuggestVenuesResult,
	VenueDraft,
	VenueEntity,
	VenueSuggestionEntity,
	VenueUsage,
	toDraftActs,
} from '@music-collection/api';
import { normalizeCatalogName } from '@music-collection/common/engine';
import { ConcertEffect, concertDay } from '@music-collection/domain/concert';
import { tapResponse } from '@ngrx/operators';
import {
	PartialStateUpdater,
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

/** Which part of the admin page is open. */
export type ConcertAdminTab =
	'suggestions' | 'venue-suggestions' | 'concerts' | 'venues';

/** Which of the four loads a card reports on. */
export type ConcertLoadKey = 'venues' | 'ai-venues' | 'concerts' | 'ai';

/**
 * What one load's last run is doing, or did.
 *
 * Kept per load rather than as one line for the page: the four runs do not
 * report the same things, and a shared line would show whichever spoke last.
 * The country travels with the run, so a result read after the country was
 * changed still says what it was about — rather than being cleared, which is
 * what used to happen and what made a finished run look like one that never
 * ran.
 */
export interface ConcertLoadRun {
	state: 'running' | 'done' | 'error';
	/** Epoch ms the run started; the card counts up from it while it runs. */
	startedAt: number;
	/** Epoch ms it ended; null while it runs. */
	endedAt: number | null;
	/** Which country it asked about, which need not be the one now picked. */
	countryCode: string;
	/** What the server said when it failed; null otherwise. */
	error: string | null;
}

/** A concert being written: the one edited, with the draft of its fields. */
interface ConcertEdit {
	uid: string;
	draft: ConcertDraft;
	/**
	 * The stored concert the draft was opened from; null for one opened from a
	 * suggestion. The write needs it whole, not by id: what the form does not
	 * hold — the artist photo, the source, the mbids, the bill — is the
	 * document's own and would be lost if the save rebuilt it from the draft.
	 */
	concert: ConcertEntity | null;
	/** Set when the draft came from a suggestion being approved. */
	suggestion: ConcertSuggestionEntity | null;
}

/** A venue being written; `uid` null while one is being added. */
interface VenueEdit {
	uid: string | null;
	draft: VenueDraft;
	/**
	 * The stored venue the draft was opened from; null for a new one and for
	 * one opened from a proposal. The write needs it whole, not by id: what the
	 * form does not hold — the mbid, the source, the day it closed — is the
	 * document's own and would be lost if the save rebuilt it from the draft.
	 */
	venue: VenueEntity | null;
	/** Set when the draft came from a proposal being approved. */
	suggestion: VenueSuggestionEntity | null;
}

interface ConcertAdminState {
	tab: ConcertAdminTab;
	concerts: ConcertEntity[];
	suggestions: ConcertSuggestionEntity[];
	venues: VenueEntity[];
	/** The venues a model proposed, waiting for an admin. */
	venueSuggestions: VenueSuggestionEntity[];
	isLoading: boolean;
	/**
	 * The concert being written, null while the lists are only being read.
	 * Named apart from the methods: a store's state and its methods share one
	 * namespace, and a method would shadow the signal.
	 */
	concertEditor: ConcertEdit | null;
	venueEditor: VenueEdit | null;
	/** What a delete confirmation is open for. */
	pendingConcert: ConcertEntity | null;
	pendingVenue: VenueEntity | null;
	/**
	 * What keeps the venue in the dialogue alive, as the server counted it;
	 * null while the count is on its way. The dialogue waits for it: the whole
	 * question is whether this is a delete or a retirement.
	 */
	pendingVenueUsage: VenueUsage | null;
	isSaving: boolean;
	/** Which load is running; only one at a time, they all cost something. */
	running: ConcertLoadKey | null;
	/**
	 * Where each load's last run got to, so every card can say what it is
	 * doing and how it ended. What the run brought back stays in the typed
	 * result below it: this holds the when, and the why not.
	 */
	runs: Partial<Record<ConcertLoadKey, ConcertLoadRun>>;
	/**
	 * Which act row the catalog was last asked about, and what came back for
	 * it. One row's worth, not one per row: only the row being typed into has
	 * its list open, and the next keystroke replaces the answer anyway.
	 */
	actRow: number | null;
	actMatches: ConcertArtistMatch[];
	/** What the last load reported, for the line under the buttons. */
	loadedVenues: LoadVenuesResult | null;
	loadedConcerts: LoadConcertsResult | null;
	suggested: SuggestConcertsResult | null;
	suggestedVenues: SuggestVenuesResult | null;
	error: string | null;
	/** Epoch milliseconds of the last successful write; null until one. */
	savedAt: number | null;
	/**
	 * Which country every load asks about. The venue loads, the concert load
	 * and both model runs read this one field: a page that asked two of them
	 * about Hungary and the third about Austria would file concerts at halls it
	 * does not hold.
	 */
	countryCode: string;
	days: number;
	/**
	 * Which cities the venue proposal run asks about, one paid request each.
	 * Empty is not none: the country is then asked as a whole, in one request,
	 * which is what names the halls that matter.
	 */
	askCities: string[];
	/**
	 * Which venues the AI run is asked about. Empty is not none: the server
	 * then walks the venue list itself, carrying on from where the last run
	 * stopped. Naming venues is what an admin does when a hall has just
	 * announced its autumn, and the round would reach it in a fortnight.
	 */
	askVenueUids: string[];
	/** What the AI run is allowed to do; null until read from the server. */
	settings: ConcertAiSettings | null;
	/** Whether the budget panel is open. Closed: it is rarely touched. */
	isSettingsOpen: boolean;
}

const initialState: ConcertAdminState = {
	tab: 'suggestions',
	concerts: [],
	suggestions: [],
	venues: [],
	venueSuggestions: [],
	isLoading: true,
	concertEditor: null,
	venueEditor: null,
	pendingConcert: null,
	pendingVenue: null,
	pendingVenueUsage: null,
	isSaving: false,
	running: null,
	runs: {},
	loadedVenues: null,
	loadedConcerts: null,
	suggested: null,
	suggestedVenues: null,
	error: null,
	savedAt: null,
	actRow: null,
	actMatches: [],
	countryCode: DEFAULT_CONCERT_COUNTRY,
	days: CONCERT_WINDOW_DAYS,
	askCities: [],
	askVenueUids: [],
	settings: null,
	isSettingsOpen: false,
};

const EMPTY_VENUE: VenueDraft = {
	name: '',
	city: null,
	countryCode: DEFAULT_CONCERT_COUNTRY,
	address: null,
	coordinates: null,
	type: 'Venue',
	active: true,
};

/**
 * Admin: the concerts of the catalog's bands, and what the loads propose.
 *
 * Four things happen here, and only the first two write anything a visitor
 * sees. The venue load fills the place list from MusicBrainz. The concert load
 * files what MusicBrainz knows of the catalog's artists — mbid-anchored, so it
 * goes straight out. The two model runs propose from a search — venues for a
 * country, nights at a venue — and both wait here until someone opens the cited
 * source and approves them.
 *
 * Why the approval step exists at all: there is no free API for future
 * concerts. MusicBrainz holds two Hungarian events in total, so a page built on
 * it alone would stay empty; and its `place` entity, which is rich for Hungary,
 * thins out elsewhere — which is why the venues have a model run of their own.
 * A model with search grounding finds what a person would find — and can be as
 * wrong as a search result is, which is why a person reads it before a
 * collector does.
 */
export const ConcertAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** The nights still to come; the past is not what an admin files. */
		coming: computed(() => {
			const today = concertDay();

			return store
				.concerts()
				.filter(
					(concert) => (concert.endsAt ?? concert.startsAt) >= today
				);
		}),
		pendingCount: computed(() => store.suggestions().length),
		/** How many proposed venues wait; the tab badge counts these. */
		pendingVenueCount: computed(() => store.venueSuggestions().length),
		venueCount: computed(() => store.venues().length),
		/** Venues nothing has retired — what the concert form may point at. */
		openVenues: computed(() =>
			store.venues().filter((venue) => venue.active !== false)
		),
		/** Whether the concert being written can be saved as it stands. */
		canSaveConcert: computed(() => {
			const draft = store.concertEditor()?.draft;

			return (
				!!draft &&
				!!draft.startsAt &&
				!!draft.venueName.trim() &&
				!!draft.title.trim()
			);
		}),
		canSaveVenue: computed(() => !!store.venueEditor()?.draft.name.trim()),
		/**
		 * Whether the delete may be attempted for the venue in the dialogue.
		 *
		 * Three states, not two. While the count is on its way the button
		 * waits; a count above zero takes the delete off the table and leaves
		 * the retirement; and a count that could not be made at all
		 * (`concerts: null` — no network, no answer) lets the attempt through,
		 * because the alternative is a disabled button with no explanation.
		 * The server re-checks either way.
		 */
		canDeleteVenue: computed(() => {
			const usage = store.pendingVenueUsage();

			return !!usage && (usage.concerts ?? 0) === 0;
		}),
		/** Whether the dialogue is still waiting for its count. */
		isCountingVenueUse: computed(
			() => !!store.pendingVenue() && !store.pendingVenueUsage()
		),
		/** Any load running blocks the others: each one costs requests. */
		isBusy: computed(() => !!store.running() || store.isSaving()),
	})),
	/*
	 * A nyitáskori összekötés külön blokkban áll, mert a szerkesztőt nyitó
	 * metódusok hívják: egy signalStore metódusa a saját blokkjának társait
	 * nem látja, a korábbi blokkét igen.
	 */
	withMethods((store, effect = inject(ConcertEffect)) => ({
		/**
		 * Ties the bill's loose names to the catalog when a name is exactly a
		 * band it holds.
		 *
		 * This is the half of the linking the form can do on its own: the
		 * loads match by name where the catalog is at hand, but a name an
		 * admin typed here used to stay loose for good. One query per unlinked
		 * act, when a concert is opened — a festival bill is the expensive
		 * case, and it is an admin's own page.
		 *
		 * Nothing is written: this fills the draft, and the save writes it.
		 */
		linkActs: rxMethod<ConcertAct[]>(
			pipe(
				switchMap((acts) => {
					const loose = acts
						.filter(
							(act) =>
								!act.artistUid &&
								act.name.trim().length >= ACT_SEARCH_LENGTH
						)
						.map((act) => act.name);

					return loose.length
						? forkJoin(
								loose.map((name) =>
									effect.searchArtists$(name).pipe(
										map((matches) => ({ matches, name })),
										catchError((error: Error) => {
											console.error(error);

											return of({
												matches:
													[] as ConcertArtistMatch[],
												name,
											});
										})
									)
								)
							)
						: of([]);
				}),
				tap((found) =>
					patchState(
						store,
						patchActs(store, (acts) =>
							acts.map((act) => {
								const hit = found.find(
									(one) => one.name === act.name
								);

								return hit
									? linkExact(act, hit.name, hit.matches)
									: act;
							})
						)
					)
				)
			)
		),
	})),
	withMethods((store, effect = inject(ConcertEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.concerts$),
				tapResponse({
					next: (concerts) =>
						patchState(store, { concerts, isLoading: false }),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: error.message,
						});
					},
				})
			)
		),

		watchSuggestions: rxMethod<void>(
			pipe(
				switchMap(() => effect.pending$),
				tapResponse({
					next: (suggestions) => patchState(store, { suggestions }),
					error: (error: Error) => console.error(error),
				})
			)
		),

		watchVenues: rxMethod<void>(
			pipe(
				switchMap(() => effect.venues$),
				tapResponse({
					next: (venues) => patchState(store, { venues }),
					error: (error: Error) => console.error(error),
				})
			)
		),

		watchVenueSuggestions: rxMethod<void>(
			pipe(
				switchMap(() => effect.pendingVenues$),
				tapResponse({
					next: (venueSuggestions) =>
						patchState(store, { venueSuggestions }),
					error: (error: Error) => console.error(error),
				})
			)
		),

		setTab: (tab: ConcertAdminTab) => patchState(store, { tab }),

		/* ── Modell-keret ───────────────────────────────────────────────── */

		/**
		 * Opens the budget panel, reading the current settings the first time.
		 * Read through a callable: the stored document also carries the day's
		 * spend, which no client may see or write.
		 */
		openSettings: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSettingsOpen: true })),
				exhaustMap(() => effect.readAiSettings$()),
				tapResponse({
					next: (settings) => patchState(store, { settings }),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							error: error.message,
							// A keret nem olvasható, de a form valahonnan
							// induljon: ugyanabból, amiből a szerver indul.
							settings: DEFAULT_CONCERT_AI_SETTINGS,
						});
					},
				})
			)
		),

		closeSettings: () => patchState(store, { isSettingsOpen: false }),

		setSettingsField: (fields: Partial<ConcertAiSettings>) => {
			const settings = store.settings();

			if (settings) {
				patchState(store, { settings: { ...settings, ...fields } });
			}
		},

		saveSettings: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const settings = store.settings();

					return settings
						? effect.writeAiSettings$(settings)
						: of(null);
				}),
				tapResponse({
					next: (settings) =>
						// A szerver vágja a számokat a felső korlátokra; amit
						// visszaad, az az érvényes beállítás.
						patchState(store, {
							settings: settings ?? store.settings(),
							isSaving: false,
							isSettingsOpen: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),
		setDays: (days: number) =>
			patchState(store, { days: Math.max(1, Math.min(365, days)) }),

		/**
		 * Which country every load asks about.
		 *
		 * The last results stay where they are: each run says which country it
		 * asked about, so a line read beside a freshly picked country is not
		 * misleading — and clearing them was worse. A run that answered and
		 * then vanished at the next click is a run nobody can tell from one
		 * that never happened.
		 */
		setCountry: (countryCode: string) =>
			patchState(store, {
				countryCode: countryCode.toUpperCase(),
				// Egy másik ország helyszíneit nem kérdezzük a mostaniakról:
				// a kijelölt helyszínek az előző országból valók.
				askVenueUids: [],
				askCities: [],
				error: null,
			}),

		/** Which cities the venue proposal run asks about; empty is the country. */
		setAskCities: (cities: string[]) =>
			patchState(store, {
				askCities: cities
					.map((city) => city.trim())
					.filter((city) => !!city),
			}),

		/**
		 * Which venues the next AI run asks about. An empty list is left empty
		 * on purpose: that is what tells the server to keep walking the round.
		 */
		setAskVenues: (uids: string[]) =>
			patchState(store, { askVenueUids: [...uids] }),

		/* ── Betöltések ─────────────────────────────────────────────────── */

		/**
		 * The country's places from MusicBrainz. Slow (a request a second,
		 * paged) but rare: the hall stays where it was.
		 */
		loadVenues: rxMethod<void>(
			pipe(
				tap(() => patchState(store, startRun('venues'))),
				exhaustMap(() => effect.loadVenues$(store.countryCode())),
				tapResponse({
					next: (loadedVenues) =>
						patchState(
							store,
							{ loadedVenues, savedAt: Date.now() },
							endRun('venues', null)
						),
					error: (error: Error) => {
						console.error(error);
						patchState(store, endRun('venues', error.message));
					},
				})
			)
		),

		/**
		 * What a model proposes as the country's venues. Paid: one request per
		 * question, and the question is the country unless cities are named.
		 * What it finds waits on the venue proposals tab — the catalog's venue
		 * list is what every concert row points at, so nothing lands there
		 * without someone having read the cited source.
		 */
		suggestVenues: rxMethod<void>(
			pipe(
				tap(() => patchState(store, startRun('ai-venues'))),
				exhaustMap(() =>
					effect.suggestVenues$({
						countryCode: store.countryCode(),
						cities: store.askCities(),
					})
				),
				tapResponse({
					next: (suggestedVenues) =>
						patchState(
							store,
							{ suggestedVenues, tab: 'venue-suggestions' },
							endRun('ai-venues', null)
						),
					error: (error: Error) => {
						console.error(error);
						patchState(store, endRun('ai-venues', error.message));
					},
				})
			)
		),

		/** What MusicBrainz knows of the catalog's artists. Goes out as filed. */
		loadConcerts: rxMethod<void>(
			pipe(
				tap(() => patchState(store, startRun('concerts'))),
				exhaustMap(() =>
					effect.loadConcerts$({
						countryCode: store.countryCode(),
						days: store.days(),
					})
				),
				tapResponse({
					next: (loadedConcerts) =>
						patchState(
							store,
							{ loadedConcerts, savedAt: Date.now() },
							endRun('concerts', null)
						),
					error: (error: Error) => {
						console.error(error);
						patchState(store, endRun('concerts', error.message));
					},
				})
			)
		),

		/**
		 * What a model proposes, from a search. Paid per venue, so the daily
		 * cap is spent on the server before the model runs — the result says
		 * what is left of it. The venues named on the page are asked about as
		 * named; with none named the server picks the next few of the round.
		 */
		suggest: rxMethod<void>(
			pipe(
				tap(() => patchState(store, startRun('ai'))),
				exhaustMap(() =>
					effect.suggestConcerts$({
						countryCode: store.countryCode(),
						days: store.days(),
						venueUids: store.askVenueUids(),
					})
				),
				tapResponse({
					next: (suggested) =>
						patchState(
							store,
							{ suggested, tab: 'suggestions' },
							endRun('ai', null)
						),
					error: (error: Error) => {
						console.error(error);
						patchState(store, endRun('ai', error.message));
					},
				})
			)
		),

		/* ── Javaslatok ─────────────────────────────────────────────────── */

		/** Files the suggestion as it stands. */
		approve: rxMethod<ConcertSuggestionEntity>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap((suggestion) => effect.approve$(suggestion)),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * Turns the suggestion down. It is kept: the next run would otherwise
		 * propose the same wrong night again.
		 */
		reject: rxMethod<ConcertSuggestionEntity>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap((suggestion) => effect.reject$(suggestion)),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/* ── Koncert szerkesztése ───────────────────────────────────────── */

		/**
		 * Opens a suggestion for correction before it is filed. A model that
		 * got the venue's spelling or the start time wrong is worth correcting
		 * rather than rejecting — the night itself may well be real.
		 */
		editSuggestion: (suggestion: ConcertSuggestionEntity) => {
			const draft = toDraft(suggestion);

			patchState(store, {
				concertEditor: {
					uid: suggestion.uid,
					concert: null,
					draft,
					suggestion,
				},
				actRow: null,
				actMatches: [],
				error: null,
			});
			store.linkActs(draft.acts);
		},

		editConcert: (concert: ConcertEntity) => {
			const draft = toDraft(concert);

			patchState(store, {
				concertEditor: {
					uid: concert.uid,
					concert,
					draft,
					suggestion: null,
				},
				actRow: null,
				actMatches: [],
				error: null,
			});
			store.linkActs(draft.acts);
		},

		cancelConcert: () =>
			patchState(store, {
				concertEditor: null,
				actRow: null,
				actMatches: [],
				error: null,
			}),

		setConcertField: (fields: Partial<ConcertDraft>) =>
			patchState(store, patchConcert(store, fields)),

		/**
		 * The bill, one supporting act per row.
		 *
		 * The credited artist is not among them and cannot be changed here: it
		 * is the catalog band the concert is filed under, and the document's id
		 * is built from it — picking another one would be a different concert.
		 */
		addAct: () =>
			patchState(
				store,
				patchActs(store, (acts) => [
					...acts,
					{ artistUid: null, imageUrl: null, name: '' },
				])
			),

		/**
		 * The name as it is being typed.
		 *
		 * A rewritten name drops the link the row had: the uid pointed at the
		 * band whose name stood there, and keeping it would file the typed
		 * name under somebody else — the one mistake the public page cannot
		 * be recovered from, because it prints the name and links the uid.
		 */
		setAct: (index: number, name: string) =>
			patchState(
				store,
				patchActs(store, (acts) =>
					acts.map((act, at) =>
						at === index ? renameAct(act, name) : act
					)
				)
			),

		removeAct: (index: number) =>
			patchState(store, {
				...patchActs(store, (acts) =>
					acts.filter((_, at) => at !== index)
				),
				actRow: null,
				actMatches: [],
			}),

		/**
		 * The catalog artists a row's name could mean.
		 *
		 * Asked from the third character on — a shorter prefix matches a good
		 * part of the catalog — and only ever one row's worth: `switchMap`
		 * drops the answer to a keystroke that has already been typed over.
		 */
		searchAct: rxMethod<{ index: number; term: string }>(
			pipe(
				tap(({ index }) => patchState(store, { actRow: index })),
				switchMap(({ index, term }) =>
					(term.trim().length < ACT_SEARCH_LENGTH
						? of([] as ConcertArtistMatch[])
						: effect.searchArtists$(term)
					).pipe(
						map((matches) => ({ index, matches, term })),
						catchError((error: Error) => {
							console.error(error);

							return of({
								index,
								matches: [] as ConcertArtistMatch[],
								term,
							});
						})
					)
				),
				tap(({ index, matches, term }) =>
					patchState(store, {
						// Ami betű szerint ugyanaz a név, azt nem kell
						// kiválasztani: a sor magától rááll a zenekarra.
						...patchActs(store, (acts) =>
							acts.map((act, at) =>
								at === index
									? linkExact(act, term, matches)
									: act
							)
						),
						actMatches: matches,
						actRow: index,
					})
				)
			)
		),

		/** The artist picked from the list: the row's name and its link both. */
		pickAct: (index: number, artist: ConcertArtistMatch) =>
			patchState(store, {
				...patchActs(store, (acts) =>
					acts.map((act, at) =>
						at === index
							? {
									artistUid: artist.uid,
									imageUrl: artist.imageUrl,
									name: artist.name,
								}
							: act
					)
				),
				actMatches: [],
				actRow: null,
			}),

		/**
		 * Saves the concert. A corrected suggestion is filed and the suggestion
		 * dropped — the same thing approving does, with the admin's own fields.
		 */
		saveConcert: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const edit = store.concertEditor();

					if (!edit) return of(null);

					// Egy üres fellépő-sor a meg nem írt gombnyomás, nem
					// névtelen zenekar: a mentés nem viszi magával.
					const draft: ConcertDraft = {
						...edit.draft,
						acts: edit.draft.acts
							.map((act) => ({ ...act, name: act.name.trim() }))
							.filter((act) => !!act.name),
					};

					if (edit.suggestion) {
						return effect.approve$(edit.suggestion, draft);
					}

					return edit.concert
						? effect.update$(edit.concert, draft)
						: of(null);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							concertEditor: null,
							actRow: null,
							actMatches: [],
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		askConcertDeletion: (pendingConcert: ConcertEntity) =>
			patchState(store, { pendingConcert, error: null }),
		cancelConcertDeletion: () =>
			patchState(store, { pendingConcert: null }),
		confirmConcertDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const concert = store.pendingConcert();

					return concert ? effect.delete$(concert) : of(undefined);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							pendingConcert: null,
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/* ── Helyszín szerkesztése ──────────────────────────────────────── */

		addVenue: () =>
			patchState(store, {
				venueEditor: {
					uid: null,
					venue: null,
					suggestion: null,
					draft: {
						...EMPTY_VENUE,
						countryCode: store.countryCode(),
					},
				},
				error: null,
			}),

		editVenue: (venue: VenueEntity) =>
			patchState(store, {
				venueEditor: {
					uid: venue.uid,
					venue,
					suggestion: null,
					draft: toVenueDraft(venue),
				},
				error: null,
			}),

		/**
		 * Opens a proposal for correction before it is filed. A model that got
		 * the address or the spelling wrong is worth correcting rather than
		 * rejecting — the hall itself may well be there.
		 */
		editVenueSuggestion: (suggestion: VenueSuggestionEntity) =>
			patchState(store, {
				venueEditor: {
					uid: suggestion.uid,
					venue: null,
					suggestion,
					draft: toVenueDraft(suggestion),
				},
				error: null,
			}),

		cancelVenue: () =>
			patchState(store, { venueEditor: null, error: null }),

		setVenueField: (fields: Partial<VenueDraft>) =>
			patchState(store, patchVenue(store, fields)),

		/**
		 * Saves the venue. A corrected proposal is filed and the proposal
		 * dropped — the same thing approving does, with the admin's own fields.
		 */
		saveVenue: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const edit = store.venueEditor();

					if (!edit) return of(null);

					if (edit.suggestion) {
						return effect.approveVenue$(
							edit.suggestion,
							edit.draft
						);
					}

					return edit.venue
						? effect.updateVenue$(edit.venue, edit.draft)
						: effect.createVenue$(edit.draft);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							venueEditor: null,
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/* ── Helyszín-javaslatok ────────────────────────────────────────── */

		/** Files the proposed venue as the model wrote it. */
		approveVenue: rxMethod<VenueSuggestionEntity>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap((suggestion) => effect.approveVenue$(suggestion)),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * Turns the proposal down. It is kept: the next run over the same
		 * country would otherwise propose the same wrong hall again.
		 */
		rejectVenue: rxMethod<VenueSuggestionEntity>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap((suggestion) => effect.rejectVenue$(suggestion)),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/* ── Visszavonás és törlés ──────────────────────────────────────── */

		/**
		 * Takes a venue off the forms, or puts it back, from the list itself.
		 *
		 * One click rather than a trip through the editor, because this is the
		 * answer to the venue that may not be deleted — and the one an admin
		 * reaches for when a club closes. What is already filed there stays
		 * filed, with the address it has.
		 */
		retireVenue: rxMethod<{ venue: VenueEntity; active: boolean }>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(({ venue, active }) =>
					effect.retireVenue$(venue, active)
				),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							savedAt: Date.now(),
							pendingVenue: null,
							pendingVenueUsage: null,
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * Opens the delete dialogue, and asks the server what keeps the venue
		 * alive. The client asks, the server decides: the dialogue's sentence
		 * is the count it gets back, and a venue a concert points at is offered
		 * for retirement instead of deletion.
		 */
		askVenueDeletion: rxMethod<VenueEntity>(
			pipe(
				tap((pendingVenue) =>
					patchState(store, {
						pendingVenue,
						pendingVenueUsage: null,
						error: null,
					})
				),
				switchMap((venue) => effect.venueUsage$(venue.uid)),
				tapResponse({
					next: (pendingVenueUsage) =>
						patchState(store, { pendingVenueUsage }),
					error: (error: Error) => {
						console.error(error);
						// Számolás nélkül nem kínálunk törlést: a nulla itt
						// nem tény, hanem a kérdés elmaradása.
						patchState(store, { error: error.message });
					},
				})
			)
		),

		cancelVenueDeletion: () =>
			patchState(store, { pendingVenue: null, pendingVenueUsage: null }),

		confirmVenueDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const venue = store.pendingVenue();

					return venue ? effect.deleteVenue$(venue) : of(undefined);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							pendingVenue: null,
							pendingVenueUsage: null,
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						// A venue a concert still points at arrives as
						// `VENUE_IN_USE`, which the page has its own sentence
						// for: retire it instead of deleting it. The dialogue
						// stays open, so that is one click away.
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),
	})),
	withHooks({
		onInit(store) {
			store.load();
			store.watchSuggestions();
			store.watchVenues();
			store.watchVenueSuggestions();
		},
	})
);

/**
 * The patch that opens a run on `key`'s card, for the country now picked.
 *
 * Every load goes through these two so that the card can say the same three
 * things about all four of them: that it is running, when it started, and how
 * it ended. The page-level error is cleared but not written: a load that fails
 * says so on its own card, beside the button that started it, rather than in a
 * line below the tabs that nobody looking at the button can see.
 */
function startRun(key: ConcertLoadKey): PartialStateUpdater<ConcertAdminState> {
	return (state) => ({
		error: null,
		running: key,
		runs: {
			...state.runs,
			[key]: {
				countryCode: state.countryCode,
				endedAt: null,
				error: null,
				startedAt: Date.now(),
				state: 'running',
			},
		},
	});
}

/** The patch that closes it; `error` is null when the run came back. */
function endRun(
	key: ConcertLoadKey,
	error: string | null
): PartialStateUpdater<ConcertAdminState> {
	return (state) => ({
		running: null,
		runs: {
			...state.runs,
			[key]: {
				countryCode: state.runs[key]?.countryCode ?? state.countryCode,
				endedAt: Date.now(),
				error,
				startedAt: state.runs[key]?.startedAt ?? Date.now(),
				state: error ? 'error' : 'done',
			},
		},
	});
}

/** The draft a stored concert opens with. */
function toDraft(
	concert: ConcertEntity | ConcertSuggestionEntity
): ConcertDraft {
	return {
		artistName: concert.artistName,
		artistUid: concert.artistUid,
		cancelled: concert.cancelled,
		city: concert.city,
		countryCode: concert.countryCode,
		endsAt: concert.endsAt,
		eventType: concert.eventType,
		sourceUrl: concert.sourceUrl,
		startsAt: concert.startsAt,
		startsAtTime: concert.startsAtTime,
		// A már megkötött linkek a draftba is átjönnek: azokat a katalógus
		// ismeretében párosította a betöltés, a form nem veszítheti el őket.
		acts: toDraftActs(concert),
		ticketUrl: concert.ticketUrl,
		title: concert.title,
		venueName: concert.venueName,
		venueUid: concert.venueUid,
	};
}

/** The state patch that changes fields of the concert being written. */
function patchConcert(
	store: { concertEditor: () => ConcertEdit | null },
	fields: Partial<ConcertDraft>
): Partial<ConcertAdminState> {
	const editor = store.concertEditor();

	return editor
		? {
				concertEditor: {
					...editor,
					draft: { ...editor.draft, ...fields },
				},
			}
		: {};
}

/** The state patch that rewrites the bill of that concert. */
function patchActs(
	store: { concertEditor: () => ConcertEdit | null },
	change: (acts: ConcertAct[]) => ConcertAct[]
): Partial<ConcertAdminState> {
	const editor = store.concertEditor();

	return editor
		? patchConcert(store, { acts: change(editor.draft.acts) })
		: {};
}

/** A row under a new name — the link goes unless the name is the same band. */
function renameAct(act: ConcertAct, name: string): ConcertAct {
	const same =
		!!act.artistUid &&
		normalizeCatalogName(act.name) === normalizeCatalogName(name);

	return {
		artistUid: same ? act.artistUid : null,
		imageUrl: same ? act.imageUrl : null,
		name,
	};
}

/**
 * The row tied to the one artist whose name is what was typed.
 *
 * The list is there to be picked from, but a name typed out in full needs no
 * picking: this is the automatic link, and it is why the search starts at
 * `ACT_SEARCH_LENGTH` characters rather than waiting for a click. A name that
 * matches two catalog artists is left alone — which of them it is, is not the
 * form's to guess.
 */
function linkExact(
	act: ConcertAct,
	term: string,
	matches: ConcertArtistMatch[]
): ConcertAct {
	if (
		act.artistUid ||
		normalizeCatalogName(act.name) !== normalizeCatalogName(term)
	) {
		return act;
	}

	const named = matches.filter(
		(match) =>
			normalizeCatalogName(match.name) === normalizeCatalogName(term)
	);

	return named.length === 1
		? {
				artistUid: named[0].uid,
				imageUrl: named[0].imageUrl,
				name: named[0].name,
			}
		: act;
}

/**
 * The draft a stored venue — or a proposal — opens with. The document's own
 * fields (the mbid, the source, the day it closed) are not in it: they are
 * carried by the entity beside the draft, and the save writes them back.
 */
function toVenueDraft(venue: VenueEntity | VenueSuggestionEntity): VenueDraft {
	return {
		active: venue.active !== false,
		address: venue.address,
		city: venue.city,
		coordinates: venue.coordinates,
		countryCode: venue.countryCode,
		name: venue.name,
		type: venue.type,
	};
}

/** The state patch that changes fields of the venue being written. */
function patchVenue(
	store: { venueEditor: () => VenueEdit | null },
	fields: Partial<VenueDraft>
): Partial<ConcertAdminState> {
	const editor = store.venueEditor();

	return editor
		? { venueEditor: { ...editor, draft: { ...editor.draft, ...fields } } }
		: {};
}
