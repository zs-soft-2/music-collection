import { Observable } from 'rxjs';

import { MusicCollectionEntity } from './music-collection';

/**
 * Data access for the collection definitions. The application binds the
 * Firestore implementation; this contract knows nothing about it, which is
 * what lets the resolver be tested without one.
 */
export abstract class MusicCollectionRepository {
	/** The published collections, kept current as they change. */
	public abstract listPublished$(): Observable<MusicCollectionEntity[]>;
	/** Every collection, drafts included (admin). */
	public abstract listAll$(): Observable<MusicCollectionEntity[]>;
	public abstract loadBySlug$(
		slug: string
	): Observable<MusicCollectionEntity | undefined>;
}
