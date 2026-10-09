import { Observable } from 'rxjs';

import { CatalogCredit, CreditsNeeded } from './music-collection-catalog';
import {
	BadgeGenerationSettings,
	CreateMusicCollectionResult,
	GenerateBadgeResult,
	MusicCollectionDraft,
	UpdateMusicCollectionResult,
} from './music-collection-function';
import { BadgeImage, MusicCollectionEntity } from './music-collection';

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
	 * The credits resolving needs, and no more. They outnumber the albums by
	 * far, so what is asked for matters: a rule naming its musicians is
	 * answered from their credits alone, and only a rule asking by role
	 * needs the catalog's whole set. See `creditsNeededFor`.
	 */
	public abstract listCredits$(
		needed: CreditsNeeded
	): Observable<CatalogCredit[]>;

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
	 * Makes one image from the collection's gallery its badge. No file is
	 * made here: every image has been one since it was drawn, so this only
	 * says which of them the pin is. `null` takes the pin off, leaving the
	 * hand-made artwork to speak for the badge.
	 */
	public abstract setBadgeImage$(
		uid: string,
		documentUid: string | null
	): Observable<void>;
	/**
	 * Takes an image an admin uploaded into the gallery and makes it the
	 * badge. The file is already in Storage; what the server adds is the
	 * `document` over it and the gallery entry — without which a hand-made
	 * image could never be a pin, only the artwork behind one.
	 */
	public abstract adoptBadgeImage$(
		uid: string,
		storagePath: string,
		fileName: string
	): Observable<BadgeImage>;

	/** What an admin may set about generation; the style lock is not in it. */
	public abstract readBadgeSettings$(): Observable<BadgeGenerationSettings>;
	public abstract updateBadgeSettings$(
		settings: BadgeGenerationSettings
	): Observable<BadgeGenerationSettings>;
}
