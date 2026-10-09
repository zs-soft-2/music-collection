import {
	Observable,
	catchError,
	from,
	map,
	of,
	switchMap,
	timeout,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
	Firestore,
	collection,
	doc,
	getCountFromServer,
	query,
	where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	CONCERT_FEATURE_KEY,
	EntityTypeEnum,
	FirestoreSyncService,
	LoadVenuesResult,
	SuggestVenuesInput,
	SuggestVenuesResult,
	VENUE_FEATURE_KEY,
	VENUE_SUGGESTION_FEATURE_KEY,
	VenueDraft,
	VenueEntity,
	VenueRepository,
	VenueSuggestionEntity,
	VenueUsage,
	toVenueSlug,
} from '@music-collection/api';

/**
 * How long the usage count is waited for before the page carries on without
 * it. Long enough for a slow connection, short enough that nobody sits in
 * front of a dialogue wondering whether it is thinking.
 */
const USAGE_TIMEOUT_MS = 8_000;

/**
 * The venues in `venue/{uid}`, served from the client cache like the rest of
 * the catalog: a few hundred documents that an admin rarely changes, which is
 * what the sync stamp is for — one download, then nothing until a load or an
 * edit.
 *
 * The proposals wait in `venue-suggestion/{uid}`, apart from the venues for the
 * same reason the concert suggestions are kept apart from the concerts: the
 * venue collection is read by everyone, and the rules let it. A proposal must
 * not be in there at all.
 *
 * No bundle: the collection is smaller than the marker bookkeeping would be
 * around it, so the documents are read directly.
 */
@Injectable({ providedIn: 'root' })
export class VenueFirestoreRepository extends VenueRepository {
	private readonly auth = inject(Auth);
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	public list$(): Observable<VenueEntity[]> {
		return this.firestoreSync.list$<VenueEntity>({
			featureKey: VENUE_FEATURE_KEY,
			query: query(collection(this.firestore, VENUE_FEATURE_KEY)),
			incremental: true,
		});
	}

	public suggestions$(): Observable<VenueSuggestionEntity[]> {
		return this.firestoreSync.list$<VenueSuggestionEntity>({
			featureKey: VENUE_SUGGESTION_FEATURE_KEY,
			query: query(
				collection(this.firestore, VENUE_SUGGESTION_FEATURE_KEY)
			),
			incremental: true,
		});
	}

	/**
	 * A venue an admin adds by hand gets a slug of its name and city as its id;
	 * a loaded one keeps its mbid. Either way the id is derived, not random:
	 * the same hall entered twice has to land on one document.
	 */
	public create$(venue: VenueDraft): Observable<VenueEntity> {
		const entity = this.toEntity(
			toVenueSlug(venue.name, venue.city),
			venue
		);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, VENUE_FEATURE_KEY, entity.uid),
				VENUE_FEATURE_KEY,
				entity
			)
		).pipe(map(() => entity));
	}

	/**
	 * Saves an edit on top of the stored venue.
	 *
	 * Only what the form holds is overwritten, and that is the point. An
	 * earlier version rebuilt the document from the draft alone, which quietly
	 * erased everything the draft has no field for: a venue loaded from
	 * MusicBrainz lost its `musicBrainzId` and its `source` — so the next load
	 * no longer recognised it as its own, and the place went on living as a
	 * hand-made duplicate — the moment somebody corrected its address or took
	 * it off the forms. `{ merge: true }` is no protection against that; the
	 * emptied fields were in the write.
	 */
	public update$(
		venue: VenueEntity,
		draft: VenueDraft
	): Observable<VenueEntity> {
		const entity: VenueEntity = {
			...venue,
			active: draft.active,
			address: draft.address,
			city: draft.city,
			coordinates: draft.coordinates,
			countryCode: draft.countryCode.toUpperCase(),
			name: draft.name.trim(),
			searchParameters: venueWords(draft.name, draft.city),
			type: draft.type,
		};

		return from(
			this.firestoreSync.set(
				doc(this.firestore, VENUE_FEATURE_KEY, venue.uid),
				VENUE_FEATURE_KEY,
				entity,
				{ merge: true }
			)
		).pipe(map(() => entity));
	}

	/**
	 * Takes the venue off the forms, or puts it back. One field, because that
	 * is the whole change: a venue that may not be deleted is retired, and
	 * going through the editor for one checkbox would be a way to lose the
	 * rest of the document.
	 */
	public retire$(venue: VenueEntity, active: boolean): Observable<void> {
		return from(
			this.firestoreSync.update(
				doc(this.firestore, VENUE_FEATURE_KEY, venue.uid),
				VENUE_FEATURE_KEY,
				{ active }
			)
		);
	}

	public delete$(venue: VenueEntity): Observable<void> {
		return from(
			this.firestoreSync.delete(
				doc(this.firestore, VENUE_FEATURE_KEY, venue.uid),
				VENUE_FEATURE_KEY
			)
		);
	}

	/**
	 * How many concerts are filed at the venue.
	 *
	 * Counted on the server rather than over the cached concerts: the number is
	 * what the delete dialogue says out loud, and the cache holds what this
	 * browser happened to download.
	 *
	 * And it is asked with a deadline. An aggregation query only ever answers
	 * from the server, so with no network, a blocked App Check token or a
	 * missing rule it can simply never settle — and the dialogue that waits
	 * for it then shows a disabled button and no reason, which is how the
	 * delete looked broken. After `USAGE_TIMEOUT_MS` the answer is `null`:
	 * not zero, not in use, simply unknown. The page offers the delete anyway
	 * and the server decides.
	 */
	public usage$(uid: string): Observable<VenueUsage> {
		return from(
			getCountFromServer(
				query(
					collection(this.firestore, CONCERT_FEATURE_KEY),
					where('venueUid', '==', uid)
				)
			)
		).pipe(
			map((snapshot): VenueUsage => ({
				concerts: snapshot.data().count,
			})),
			timeout({ each: USAGE_TIMEOUT_MS }),
			catchError((error: Error) => {
				console.warn('A helyszín használata nem olvasható', error);

				return of<VenueUsage>({ concerts: null });
			})
		);
	}

	/**
	 * The country's places from MusicBrainz. Server work: it is a few hundred
	 * paged requests under a one-per-second rate limit, with a User-Agent that
	 * identifies the project.
	 */
	public load$(countryCode: string): Observable<LoadVenuesResult> {
		const callable = httpsCallable<
			{ countryCode: string },
			LoadVenuesResult
		>(this.functions, 'loadConcertVenues');

		return from(callable({ countryCode })).pipe(
			map((result) => result.data)
		);
	}

	/**
	 * What a model proposes as a country's venues. Paid work, one request per
	 * question, and the daily budget is spent on the server before the model
	 * runs — the result says what is left of it.
	 */
	public suggest$(
		input: SuggestVenuesInput
	): Observable<SuggestVenuesResult> {
		const callable = httpsCallable<SuggestVenuesInput, SuggestVenuesResult>(
			this.functions,
			'suggestVenues'
		);

		return from(callable(input)).pipe(map((result) => result.data));
	}

	/**
	 * Files a proposal as a venue, then drops the proposal.
	 *
	 * In this order, and not in one batch: the two documents are of different
	 * features, and the sync stamps one feature per batch. If the second write
	 * fails the venue is already filed — which is the half worth keeping, and
	 * the next run sees it as one it already holds rather than proposing it
	 * again.
	 *
	 * The proposal is deleted rather than marked approved: what stops a hall
	 * coming back is the venue itself, and a rejection is the only decision
	 * that has to be remembered here.
	 */
	public approveSuggestion$(
		suggestion: VenueSuggestionEntity,
		draft?: VenueDraft
	): Observable<VenueEntity> {
		const filed = draft ?? toDraft(suggestion);
		const entity: VenueEntity = {
			active: filed.active,
			address: filed.address,
			city: filed.city,
			closedAt: null,
			coordinates: filed.coordinates,
			countryCode: filed.countryCode.toUpperCase(),
			entityType: EntityTypeEnum.Venue,
			// A javaslatnak nincs mbid-je, és nem is lesz: amit a modell
			// talált, azt a MusicBrainz nem ismeri. A következő betöltés ezért
			// nem is írja át — csak a `musicbrainz` forrásúakat bántja.
			musicBrainzId: null,
			name: filed.name.trim(),
			searchParameters: venueWords(filed.name, filed.city),
			source: 'ai',
			type: filed.type,
			uid: suggestion.uid,
		};

		return from(
			this.firestoreSync.set(
				doc(this.firestore, VENUE_FEATURE_KEY, suggestion.uid),
				VENUE_FEATURE_KEY,
				entity
			)
		).pipe(
			switchMap(() =>
				this.firestoreSync.delete(
					doc(
						this.firestore,
						VENUE_SUGGESTION_FEATURE_KEY,
						suggestion.uid
					),
					VENUE_SUGGESTION_FEATURE_KEY
				)
			),
			map(() => entity)
		);
	}

	/**
	 * Marks a proposal rejected, and keeps it. This is the whole reason the
	 * collection exists: the next run over the same country would propose the
	 * same wrong hall again, and an admin would decide it again every week.
	 */
	public rejectSuggestion$(
		suggestion: VenueSuggestionEntity
	): Observable<void> {
		return from(
			this.firestoreSync.update(
				doc(
					this.firestore,
					VENUE_SUGGESTION_FEATURE_KEY,
					suggestion.uid
				),
				VENUE_SUGGESTION_FEATURE_KEY,
				{
					reviewState: 'rejected',
					reviewedAt: Date.now(),
					reviewedBy: this.auth.currentUser?.uid ?? null,
				}
			)
		);
	}

	/**
	 * The document a draft writes. A venue entered by hand says so in `source`:
	 * the loader reads that field and leaves such a venue alone, so corrected
	 * details are not overwritten by the next load.
	 */
	private toEntity(uid: string, venue: VenueDraft): VenueEntity {
		return {
			active: venue.active,
			address: venue.address,
			city: venue.city,
			closedAt: null,
			coordinates: venue.coordinates,
			countryCode: venue.countryCode.toUpperCase(),
			entityType: EntityTypeEnum.Venue,
			musicBrainzId: null,
			name: venue.name.trim(),
			searchParameters: venueWords(venue.name, venue.city),
			source: 'manual',
			type: venue.type,
			uid,
		};
	}
}

/** The fields of a proposal that a venue is filed from, unchanged. */
function toDraft(suggestion: VenueSuggestionEntity): VenueDraft {
	return {
		active: true,
		address: suggestion.address,
		city: suggestion.city,
		coordinates: suggestion.coordinates,
		countryCode: suggestion.countryCode,
		name: suggestion.name,
		type: suggestion.type,
	};
}

/**
 * The words the admin's venue search matches on. Words, not prefixes: a venue
 * is looked up by what it is called, and `array-contains` on a word list is one
 * index instead of a prefix tree.
 */
export function venueWords(name: string, city: string | null): string[] {
	const words = `${name} ${city ?? ''}`
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 1);

	return [...new Set(words)];
}
