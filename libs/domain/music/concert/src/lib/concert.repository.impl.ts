import { Observable, from, map, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
	Firestore,
	collection,
	doc,
	getDocs,
	limit,
	query,
	where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	ACT_MATCH_LIMIT,
	ACT_SEARCH_LENGTH,
	ARTIST_FEATURE_KEY,
	CONCERT_FEATURE_KEY,
	CONCERT_SUGGESTION_FEATURE_KEY,
	ConcertAiSettings,
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEntity,
	ConcertRepository,
	ConcertSuggestionEntity,
	EntityTypeEnum,
	FirestoreSyncService,
	LoadConcertsInput,
	LoadConcertsResult,
	SuggestConcertsInput,
	SuggestConcertsResult,
	toConcertBill,
	toConcertId,
	toConcertLineup,
} from '@music-collection/api';

import { venueWords } from './venue.repository.impl';

/**
 * The concerts in `concert/{uid}` and the suggestions in
 * `concert-suggestion/{uid}`.
 *
 * Two collections rather than a status field on one, because they are read by
 * different people: the public page reads every concert there is, and the rules
 * let it. A pending suggestion must not be in that collection at all — a rule
 * that filtered on a field would have to be matched by every query, and the
 * sync reads a collection whole.
 *
 * The loads are callables: they talk to MusicBrainz and to a Vertex model with
 * the project's own credentials, which no browser holds.
 */
@Injectable({ providedIn: 'root' })
export class ConcertFirestoreRepository extends ConcertRepository {
	private readonly auth = inject(Auth);
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly functions = inject(Functions);

	public list$(): Observable<ConcertEntity[]> {
		return this.firestoreSync.list$<ConcertEntity>({
			featureKey: CONCERT_FEATURE_KEY,
			query: query(collection(this.firestore, CONCERT_FEATURE_KEY)),
			incremental: true,
		});
	}

	public suggestions$(): Observable<ConcertSuggestionEntity[]> {
		return this.firestoreSync.list$<ConcertSuggestionEntity>({
			featureKey: CONCERT_SUGGESTION_FEATURE_KEY,
			query: query(
				collection(this.firestore, CONCERT_SUGGESTION_FEATURE_KEY)
			),
			incremental: true,
		});
	}

	public create$(concert: ConcertDraft): Observable<ConcertEntity> {
		const uid = toConcertId(
			concert.artistUid,
			concert.startsAt,
			concert.venueName
		);
		const entity = this.toEntity(uid, concert, 'manual');

		return from(
			this.firestoreSync.set(
				doc(this.firestore, CONCERT_FEATURE_KEY, uid),
				CONCERT_FEATURE_KEY,
				entity
			)
		).pipe(map(() => entity));
	}

	/**
	 * Saves an edit. The id is left as it was even when the day or the venue
	 * changed: moving the document would mean a delete and a write, and a
	 * corrected concert is the same night, not a new one.
	 *
	 * Only what the form holds is overwritten. Rebuilding the whole document
	 * from the draft is what an earlier version did, and it quietly erased
	 * everything the draft has no field for: an approved suggestion lost its
	 * artist photo, its mbids and its `source: 'ai'` — so the page lost the
	 * picture and the badge that says a person checked the night — the moment
	 * someone corrected its start time. `{ merge: true }` is no protection
	 * against that; the emptied fields were in the write.
	 */
	public update$(
		concert: ConcertEntity,
		draft: ConcertDraft
	): Observable<ConcertEntity> {
		const entity: ConcertEntity = {
			...concert,
			...fromDraft(draft),
			...toConcertBill(draft, concert.artistImageUrl),
			searchParameters: venueWords(
				`${draft.artistName} ${draft.venueName}`,
				draft.city
			),
		};

		return from(
			this.firestoreSync.set(
				doc(this.firestore, CONCERT_FEATURE_KEY, concert.uid),
				CONCERT_FEATURE_KEY,
				entity,
				{ merge: true }
			)
		).pipe(map(() => entity));
	}

	public delete$(concert: ConcertEntity): Observable<void> {
		return from(
			this.firestoreSync.delete(
				doc(this.firestore, CONCERT_FEATURE_KEY, concert.uid),
				CONCERT_FEATURE_KEY
			)
		);
	}

	/**
	 * Files a suggestion as a concert, then drops the suggestion.
	 *
	 * In this order, and not in one batch: the two documents are of different
	 * features, and the sync stamps one feature per batch. If the second write
	 * fails the concert is already filed — which is the half worth keeping, and
	 * the next load sees it as a duplicate rather than proposing it again.
	 *
	 * The suggestion is deleted rather than marked approved: what stops a night
	 * coming back is the concert itself, and a rejection is the only decision
	 * that has to be remembered here.
	 */
	public approve$(
		suggestion: ConcertSuggestionEntity,
		draft?: ConcertDraft
	): Observable<ConcertEntity> {
		// Amit az admin a jóváhagyás előtt átírt, az a javaslat fölé kerül; a
		// bill is a szerkesztett névsorból épül, a benne álló linkekkel együtt.
		const filed = draft
			? { ...suggestion, ...fromDraft(draft) }
			: suggestion;
		const bill = draft
			? toConcertBill(draft, suggestion.artistImageUrl)
			: {
					lineup: toConcertLineup(suggestion),
					supportingActs: suggestion.supportingActs ?? [],
				};
		const entity: ConcertEntity = {
			approvedAt: Date.now(),
			approvedBy: this.auth.currentUser?.uid ?? null,
			artistImageUrl: suggestion.artistImageUrl,
			artistName: filed.artistName,
			artistUid: filed.artistUid,
			cancelled: filed.cancelled,
			city: filed.city,
			countryCode: filed.countryCode,
			endsAt: filed.endsAt,
			entityType: EntityTypeEnum.Concert,
			eventType: filed.eventType,
			lineup: bill.lineup,
			matchedBy: suggestion.matchedBy,
			musicBrainzArtistIds: suggestion.musicBrainzArtistIds,
			musicBrainzEventId: suggestion.musicBrainzEventId,
			searchParameters: draft
				? venueWords(
						`${filed.artistName} ${filed.venueName}`,
						filed.city
					)
				: suggestion.searchParameters,
			source: suggestion.source,
			sourceUrl: filed.sourceUrl,
			startsAt: filed.startsAt,
			startsAtTime: filed.startsAtTime,
			supportingActs: bill.supportingActs,
			ticketUrl: filed.ticketUrl,
			title: filed.title,
			uid: suggestion.uid,
			venueName: filed.venueName,
			venueUid: filed.venueUid,
		};

		return from(
			this.firestoreSync.set(
				doc(this.firestore, CONCERT_FEATURE_KEY, suggestion.uid),
				CONCERT_FEATURE_KEY,
				entity
			)
		).pipe(
			switchMap(() =>
				this.firestoreSync.delete(
					doc(
						this.firestore,
						CONCERT_SUGGESTION_FEATURE_KEY,
						suggestion.uid
					),
					CONCERT_SUGGESTION_FEATURE_KEY
				)
			),
			map(() => entity)
		);
	}

	/**
	 * Marks a suggestion rejected, and keeps it. This is the whole reason the
	 * collection exists: the next run would propose the same wrong night again,
	 * and an admin would decide it again every week.
	 */
	public reject$(suggestion: ConcertSuggestionEntity): Observable<void> {
		return from(
			this.firestoreSync.update(
				doc(
					this.firestore,
					CONCERT_SUGGESTION_FEATURE_KEY,
					suggestion.uid
				),
				CONCERT_SUGGESTION_FEATURE_KEY,
				{
					reviewState: 'rejected',
					reviewedAt: Date.now(),
					reviewedBy: this.auth.currentUser?.uid ?? null,
				}
			)
		);
	}

	/**
	 * Catalog artists whose name starts with the typed text.
	 *
	 * A prefix search on `searchParameters`, which every artist carries: the
	 * growing prefixes of its name in lower case. One `array-contains` needs
	 * no composite index, so nothing has to be deployed for this to answer.
	 *
	 * Read straight off the server rather than through the sync: the answer
	 * has to be current — a band added this morning is exactly the one an
	 * admin is looking for — and it is a handful of documents, not a list.
	 */
	public searchArtists$(term: string): Observable<ConcertArtistMatch[]> {
		const prefix = term.trim().toLowerCase();

		if (prefix.length < ACT_SEARCH_LENGTH) return of([]);

		return from(
			getDocs(
				query(
					collection(this.firestore, ARTIST_FEATURE_KEY),
					where('searchParameters', 'array-contains', prefix),
					limit(ACT_MATCH_LIMIT)
				)
			)
		).pipe(
			map((snapshot) =>
				snapshot.docs
					.map((document) =>
						toArtistMatch(document.id, document.data())
					)
					.sort((left, right) =>
						left.name.localeCompare(right.name, 'hu')
					)
			)
		);
	}

	public load$(input: LoadConcertsInput): Observable<LoadConcertsResult> {
		const callable = httpsCallable<LoadConcertsInput, LoadConcertsResult>(
			this.functions,
			'loadConcertsFromMusicBrainz'
		);

		return from(callable(input)).pipe(map((result) => result.data));
	}

	public suggest$(
		input: SuggestConcertsInput
	): Observable<SuggestConcertsResult> {
		const callable = httpsCallable<
			SuggestConcertsInput,
			SuggestConcertsResult
		>(this.functions, 'suggestConcerts');

		return from(callable(input)).pipe(map((result) => result.data));
	}

	/**
	 * The AI budget. Read through a callable rather than from `app-setting`
	 * directly: the document also carries the day's spend, which only the
	 * server may write, and the rules keep the whole document out of reach.
	 */
	public readSettings$(): Observable<ConcertAiSettings> {
		const callable = httpsCallable<void, ConcertAiSettings>(
			this.functions,
			'readConcertAiSettings'
		);

		return from(callable()).pipe(map((result) => result.data));
	}

	public writeSettings$(
		settings: ConcertAiSettings
	): Observable<ConcertAiSettings> {
		const callable = httpsCallable<
			{ settings: ConcertAiSettings },
			ConcertAiSettings
		>(this.functions, 'updateConcertAiSettings');

		return from(callable({ settings })).pipe(map((result) => result.data));
	}

	/** The document a draft writes. */
	private toEntity(
		uid: string,
		concert: ConcertDraft,
		source: 'manual'
	): ConcertEntity {
		return {
			...toConcertBill(concert, null),
			artistImageUrl: null,
			artistName: concert.artistName,
			artistUid: concert.artistUid,
			cancelled: concert.cancelled,
			city: concert.city,
			countryCode: concert.countryCode.toUpperCase(),
			endsAt: concert.endsAt,
			entityType: EntityTypeEnum.Concert,
			eventType: concert.eventType,
			matchedBy: 'manual',
			musicBrainzArtistIds: [],
			musicBrainzEventId: null,
			searchParameters: venueWords(
				`${concert.artistName} ${concert.venueName}`,
				concert.city
			),
			source,
			sourceUrl: concert.sourceUrl,
			startsAt: concert.startsAt,
			startsAtTime: concert.startsAtTime,
			ticketUrl: concert.ticketUrl,
			title: concert.title,
			uid,
			venueName: concert.venueName,
			venueUid: concert.venueUid,
		};
	}
}

/**
 * The concert fields an edited draft overwrites.
 *
 * Listed one by one rather than spread whole, because the draft's bill is not
 * a document field: it is written as a line-up and a name list, and `acts`
 * itself has no business in the document.
 */
function fromDraft(draft: ConcertDraft): Omit<ConcertDraft, 'acts'> {
	return {
		artistName: draft.artistName,
		artistUid: draft.artistUid,
		cancelled: draft.cancelled,
		city: draft.city,
		countryCode: draft.countryCode,
		endsAt: draft.endsAt,
		eventType: draft.eventType,
		sourceUrl: draft.sourceUrl,
		startsAt: draft.startsAt,
		startsAtTime: draft.startsAtTime,
		ticketUrl: draft.ticketUrl,
		title: draft.title,
		venueName: draft.venueName,
		venueUid: draft.venueUid,
	};
}

/** An artist document as the act rows offer it: a name, a uid and a photo. */
function toArtistMatch(
	uid: string,
	data: Record<string, unknown>
): ConcertArtistMatch {
	const discogs = data['discogs'] as { imageUrl?: string | null } | undefined;

	return {
		imageUrl:
			(data['imageUrl'] as string | null) ?? discogs?.imageUrl ?? null,
		name: (data['name'] as string) ?? '',
		uid,
	};
}
