import { Observable, catchError, map, of } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	DocumentData,
	Firestore,
	Timestamp,
	collection,
	doc,
	docData,
	limit,
	orderBy,
	query,
} from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import {
	CollectorAlbumsDocument,
	CollectorCardDocument,
	CollectorProfileDocument,
	PublicCollectorAlbums,
	PublicCollectorCard,
	PublicCollectorProfile,
} from './collector-profile.model';

export const COLLECTOR_PROFILE_FEATURE_KEY = 'collector';

/** The full shelf lives under the profile: `collector/{uid}/albums/all`. */
export const COLLECTOR_ALBUMS_COLLECTION = 'albums';
export const COLLECTOR_ALBUMS_DOCUMENT = 'all';

/** The directory the wall of finished collections is drawn from. */
export const COLLECTOR_CARD_FEATURE_KEY = 'collector-card';

/**
 * How many collectors the directory asks for at once. Everything the wall
 * sorts and filters by travels in the card, so this is read once and worked
 * on in the browser rather than queried per sort.
 */
export const DIRECTORY_LIMIT = 60;

/**
 * Data access for the profiles collectors chose to share: `collector/{uid}`.
 *
 * Its own collection, not a field of the user, because the rules let everybody
 * read it — signed in or not. A document is here only while its owner shares
 * one, so withdrawing is a deletion rather than a flag, and nothing has to be
 * filtered out on the way to a visitor.
 */
@Injectable({ providedIn: 'root' })
export class CollectorProfileRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);

	/**
	 * One collector's page: everything a visit needs, in a single read.
	 * Null while nothing is shared under that uid — which is also what a
	 * withdrawn profile looks like.
	 */
	public profile$(uid: string): Observable<CollectorProfileDocument | null> {
		return this.document$(uid).pipe(
			map((data) => (data ? toProfile(data) : null)),
			// A page that cannot be read is not worth an error screen: the
			// visitor is told there is nothing here, which is the truth as
			// far as they can see.
			catchError((error) => {
				console.warn('Collector profile unavailable', error);

				return of(null);
			})
		);
	}

	/**
	 * Overwrites the document, so a withdrawn wishlist — or a narrowed
	 * location — drops the fields it no longer allows instead of leaving
	 * them behind for a visitor to read.
	 */
	public save(profile: PublicCollectorProfile): Promise<void> {
		return this.firestoreSync.set(
			this.reference(profile.uid),
			COLLECTOR_PROFILE_FEATURE_KEY,
			profile
		);
	}

	public remove(uid: string): Promise<void> {
		return this.firestoreSync.delete(
			this.reference(uid),
			COLLECTOR_PROFILE_FEATURE_KEY
		);
	}

	/**
	 * The whole shelf, read only when a visitor asks for it. Null while
	 * there is none — which is also what a withdrawn profile leaves behind,
	 * since the rules refuse this list once the page above it is gone.
	 */
	public albums$(uid: string): Observable<CollectorAlbumsDocument | null> {
		return this.albumsDocument$(uid).pipe(
			map((data) => (data ? (data as CollectorAlbumsDocument) : null)),
			catchError((error) => {
				console.warn('Collector albums unavailable', error);

				return of(null);
			})
		);
	}

	public saveAlbums(albums: PublicCollectorAlbums): Promise<void> {
		return this.firestoreSync.set(
			this.albumsReference(albums.uid),
			COLLECTOR_PROFILE_FEATURE_KEY,
			albums
		);
	}

	public removeAlbums(uid: string): Promise<void> {
		return this.firestoreSync.delete(
			this.albumsReference(uid),
			COLLECTOR_PROFILE_FEATURE_KEY
		);
	}

	/**
	 * Every collector in the directory, newest first.
	 *
	 * Read through the sync cache, like the map's pins: the first visit pays
	 * for the list and later ones pay nothing until somebody's shelf changes
	 * and bumps the feature's stamp. That is what makes a wall of collectors
	 * affordable on a page everybody opens.
	 */
	public cards$(): Observable<CollectorCardDocument[]> {
		return this.firestoreSync.list$<CollectorCardDocument>({
			featureKey: COLLECTOR_CARD_FEATURE_KEY,
			cacheKey: COLLECTOR_CARD_FEATURE_KEY,
			query: runInInjectionContext(this.injector, () =>
				query(
					collection(this.firestore, COLLECTOR_CARD_FEATURE_KEY),
					orderBy('updatedAt', 'desc'),
					limit(DIRECTORY_LIMIT)
				)
			),
		});
	}

	public saveCard(card: PublicCollectorCard): Promise<void> {
		return this.firestoreSync.set(
			this.cardReference(card.uid),
			COLLECTOR_CARD_FEATURE_KEY,
			card
		);
	}

	public removeCard(uid: string): Promise<void> {
		return this.firestoreSync.delete(
			this.cardReference(uid),
			COLLECTOR_CARD_FEATURE_KEY
		);
	}

	/**
	 * AngularFire expects its APIs in an injection context; these run from a
	 * stream or an event handler, long after the repository was built.
	 */
	private document$(uid: string) {
		return runInInjectionContext(this.injector, () =>
			docData(this.reference(uid))
		);
	}

	private reference(uid: string) {
		return runInInjectionContext(this.injector, () =>
			doc(this.firestore, COLLECTOR_PROFILE_FEATURE_KEY, uid)
		);
	}

	private albumsDocument$(uid: string) {
		return runInInjectionContext(this.injector, () =>
			docData(this.albumsReference(uid))
		);
	}

	private cardReference(uid: string) {
		return runInInjectionContext(this.injector, () =>
			doc(this.firestore, COLLECTOR_CARD_FEATURE_KEY, uid)
		);
	}

	private albumsReference(uid: string) {
		return runInInjectionContext(this.injector, () =>
			doc(
				this.firestore,
				COLLECTOR_PROFILE_FEATURE_KEY,
				uid,
				COLLECTOR_ALBUMS_COLLECTION,
				COLLECTOR_ALBUMS_DOCUMENT
			)
		);
	}
}

/**
 * The stamp the sync service writes is a Firestore timestamp; the page shows
 * how long ago the shelf was counted, so it travels on as epoch
 * milliseconds — the same shape every other read of ours hands up.
 */
function toProfile(data: DocumentData): CollectorProfileDocument {
	const { updatedAt, ...profile } = data;

	return updatedAt instanceof Timestamp
		? {
				...(profile as CollectorProfileDocument),
				updatedAt: updatedAt.toMillis(),
			}
		: (profile as CollectorProfileDocument);
}
