import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
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
	CONCERT_FEATURE_KEY,
	EntityTypeEnum,
	FirestoreSyncService,
	LoadVenuesResult,
	VENUE_FEATURE_KEY,
	VenueDraft,
	VenueEntity,
	VenueRepository,
	toVenueSlug,
} from '@music-collection/api';

/**
 * The venues in `venue/{uid}`, served from the client cache like the rest of
 * the catalog: a few hundred documents that an admin rarely changes, which is
 * what the sync stamp is for — one download, then nothing until a load or an
 * edit.
 *
 * No bundle: the collection is smaller than the marker bookkeeping would be
 * around it, so the documents are read directly.
 */
@Injectable({ providedIn: 'root' })
export class VenueFirestoreRepository extends VenueRepository {
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

	public update$(uid: string, venue: VenueDraft): Observable<VenueEntity> {
		const entity = this.toEntity(uid, venue);

		return from(
			this.firestoreSync.set(
				doc(this.firestore, VENUE_FEATURE_KEY, uid),
				VENUE_FEATURE_KEY,
				entity,
				{ merge: true }
			)
		).pipe(map(() => entity));
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
	 * Whether a concert is filed at the venue. Asked of the server rather than
	 * of the cached concerts: the answer is what a delete turns on, and it has
	 * to be current.
	 */
	public isInUse$(uid: string): Observable<boolean> {
		return from(
			getDocs(
				query(
					collection(this.firestore, CONCERT_FEATURE_KEY),
					where('venueUid', '==', uid),
					limit(1)
				)
			)
		).pipe(map((snapshot) => !snapshot.empty));
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
