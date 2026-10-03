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
	VenueDraft,
	VenueEntity,
	toDraftActs,
} from '@music-collection/api';
import { normalizeCatalogName } from '@music-collection/common/engine';
import { ConcertEffect, concertDay } from '@music-collection/domain/concert';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

/** Which part of the admin page is open. */
export type ConcertAdminTab = 'suggestions' | 'concerts' | 'venues';

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
}

interface ConcertAdminState {
	tab: ConcertAdminTab;
	concerts: ConcertEntity[];
	suggestions: ConcertSuggestionEntity[];
	venues: VenueEntity[];
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
	isSaving: boolean;
	/** Which load is running; only one at a time, they all cost something. */
	running: 'venues' | 'concerts' | 'ai' | null;
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
	error: string | null;
	/** Epoch milliseconds of the last successful write; null until one. */
	savedAt: number | null;
	/** Which country the loads ask about. One for now, but not hard-coded. */
	countryCode: string;
	days: number;
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
	isLoading: true,
	concertEditor: null,
	venueEditor: null,
	pendingConcert: null,
	pendingVenue: null,
	isSaving: false,
	running: null,
	loadedVenues: null,
	loadedConcerts: null,
	suggested: null,
	error: null,
	savedAt: null,
	actRow: null,
	actMatches: [],
	countryCode: DEFAULT_CONCERT_COUNTRY,
	days: CONCERT_WINDOW_DAYS,
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
 * Three things happen here, and only the first two write anything a visitor
 * sees. The venue load fills the place list from MusicBrainz. The concert load
 * files what MusicBrainz knows of the catalog's artists — mbid-anchored, so it
 * goes straight out. The AI run proposes nights from a search, and those wait
 * here until someone opens the cited source and approves them.
 *
 * Why the approval step exists at all: there is no free API for future
 * concerts. MusicBrainz holds two Hungarian events in total, so a page built on
 * it alone would stay empty. A model with search grounding finds what a person
 * would find — and can be as wrong as a search result is, which is why a person
 * reads it before a collector does.
 */
export const ConcertAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** The nights still to come; the past is not what an admin files. */
		coming: computed(() => {
			const today = concertDay();

			return store
				.concerts()
				.filter((concert) => (concert.endsAt ?? concert.startsAt) >= today);
		}),
		pendingCount: computed(() => store.suggestions().length),
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
		canSaveVenue: computed(
			() => !!store.venueEditor()?.draft.name.trim()
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

		/* ── Betöltések ─────────────────────────────────────────────────── */

		/**
		 * The country's places from MusicBrainz. Slow (a request a second,
		 * paged) but rare: the hall stays where it was.
		 */
		loadVenues: rxMethod<void>(
			pipe(
				tap(() =>
					patchState(store, { running: 'venues', error: null })
				),
				exhaustMap(() => effect.loadVenues$(store.countryCode())),
				tapResponse({
					next: (loadedVenues) =>
						patchState(store, {
							loadedVenues,
							running: null,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							running: null,
							error: error.message,
						});
					},
				})
			)
		),

		/** What MusicBrainz knows of the catalog's artists. Goes out as filed. */
		loadConcerts: rxMethod<void>(
			pipe(
				tap(() =>
					patchState(store, { running: 'concerts', error: null })
				),
				exhaustMap(() =>
					effect.loadConcerts$({
						countryCode: store.countryCode(),
						days: store.days(),
					})
				),
				tapResponse({
					next: (loadedConcerts) =>
						patchState(store, {
							loadedConcerts,
							running: null,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							running: null,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * What a model proposes, from a search. Paid per artist, so the daily
		 * cap is spent on the server before the model runs — the result says
		 * what is left of it.
		 */
		suggest: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { running: 'ai', error: null })),
				exhaustMap(() =>
					effect.suggestConcerts$({
						countryCode: store.countryCode(),
						days: store.days(),
					})
				),
				tapResponse({
					next: (suggested) =>
						patchState(store, {
							suggested,
							running: null,
							tab: 'suggestions',
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							running: null,
							error: error.message,
						});
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
		cancelConcertDeletion: () => patchState(store, { pendingConcert: null }),
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
					draft: {
						active: venue.active !== false,
						address: venue.address,
						city: venue.city,
						coordinates: venue.coordinates,
						countryCode: venue.countryCode,
						name: venue.name,
						type: venue.type,
					},
				},
				error: null,
			}),

		cancelVenue: () => patchState(store, { venueEditor: null, error: null }),

		setVenueField: (fields: Partial<VenueDraft>) =>
			patchState(store, patchVenue(store, fields)),

		saveVenue: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const edit = store.venueEditor();

					if (!edit) return of(null);

					return edit.uid
						? effect.updateVenue$(edit.uid, edit.draft)
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

		askVenueDeletion: (pendingVenue: VenueEntity) =>
			patchState(store, { pendingVenue, error: null }),
		cancelVenueDeletion: () => patchState(store, { pendingVenue: null }),
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
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						// A venue a concert still points at arrives as
						// `VENUE_IN_USE`, which the page has its own sentence
						// for: retire it instead of deleting it.
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
		},
	})
);

/** The draft a stored concert opens with. */
function toDraft(concert: ConcertEntity | ConcertSuggestionEntity): ConcertDraft {
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
