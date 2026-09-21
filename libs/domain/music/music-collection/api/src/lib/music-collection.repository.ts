import { Observable } from 'rxjs';

import { CatalogCredit } from './music-collection-catalog';
import {
	CreateMusicCollectionResult,
	MusicCollectionDraft,
	UpdateMusicCollectionResult,
} from './music-collection-function';
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
	public abstract loadByUid$(
		uid: string
	): Observable<MusicCollectionEntity | undefined>;

	/**
	 * Every credit of the catalog. Only a collection that asks about who
	 * played on a record needs them, and they outnumber the albums by far,
	 * so they are fetched when a criterion actually wants them.
	 */
	public abstract listCredits$(): Observable<CatalogCredit[]>;

	/**
	 * Writing goes through the callables: the rules refuse every client write
	 * to the definitions, so the permission and the criteria are checked
	 * where the client cannot reach them.
	 */
	public abstract create$(
		collection: MusicCollectionDraft
	): Observable<CreateMusicCollectionResult>;
	public abstract update$(
		uid: string,
		collection: MusicCollectionDraft
	): Observable<UpdateMusicCollectionResult>;
	public abstract delete$(uid: string): Observable<void>;
}
