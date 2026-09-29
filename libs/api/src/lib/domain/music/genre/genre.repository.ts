import { Observable } from 'rxjs';

import { GenreDraft, GenreEntity } from './genre';

/**
 * Data access for the taxonomy. The application binds the Firestore
 * implementation; what reads a genre knows only this.
 */
export abstract class GenreRepository {
	/** Every genre, kept current as an admin edits them. */
	public abstract list$(): Observable<GenreEntity[]>;
	public abstract create$(genre: GenreDraft): Observable<GenreEntity>;
	public abstract update$(
		uid: string,
		genre: GenreDraft
	): Observable<GenreEntity>;
	public abstract delete$(genre: GenreEntity): Observable<void>;

	/**
	 * Whether any artist of the catalog carries the genre. One read: the
	 * question is only whether there is a first one, not how many.
	 */
	public abstract isInUse$(name: string): Observable<boolean>;
}
