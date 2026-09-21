import { Observable } from 'rxjs';

import { CatalogCredit } from './music-collection-catalog';
import {
	BadgeGenerationSettings,
	BadgeImageDraft,
	BadgeModelOption,
	CreateMusicCollectionResult,
	GenerateBadgeResult,
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

	/**
	 * The badge. Generating draws several candidates and stores them; only
	 * the one an admin picks is frozen onto the definition, so the last word
	 * stays human while the work does not.
	 */
	public abstract generateBadge$(
		uid: string,
		points: number
	): Observable<GenerateBadgeResult>;
	/**
	 * Freezes the picked candidate: the file is uploaded where covers go and
	 * a `document` entity is written over it, so the badge is catalogued like
	 * every other file rather than loose in a bucket.
	 */
	public abstract setBadgeImage$(
		uid: string,
		image: BadgeImageDraft
	): Observable<void>;

	/** What an admin may set about generation; the style lock is not in it. */
	public abstract readBadgeSettings$(): Observable<BadgeGenerationSettings>;
	public abstract updateBadgeSettings$(
		settings: BadgeGenerationSettings
	): Observable<BadgeGenerationSettings>;
	/** A választható képmodellek, élőben — nem egy kódba írt lista. */
	public abstract listBadgeModels$(): Observable<BadgeModelOption[]>;
}
