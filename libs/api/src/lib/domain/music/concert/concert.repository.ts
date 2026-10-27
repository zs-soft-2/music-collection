import { Observable } from 'rxjs';

import {
	ConcertAiSettings,
	LoadConcertsInput,
	LoadConcertsResult,
	SuggestConcertsInput,
	SuggestConcertsResult,
} from './concert-load';
import {
	ConcertArtistMatch,
	ConcertDraft,
	ConcertEntity,
	ConcertSuggestionEntity,
} from './concert';

/**
 * Data access for the concerts and for the suggestions waiting behind them.
 *
 * The reads are client reads — the concerts are catalog data, cached like the
 * rest of it. The loads are not: they run on the server, with the project's own
 * MusicBrainz identity and Vertex credentials.
 */
export abstract class ConcertRepository {
	/** Every filed concert, kept current. The page drops the past days. */
	public abstract list$(): Observable<ConcertEntity[]>;
	/** The suggestions, pending and rejected both; only an admin reads these. */
	public abstract suggestions$(): Observable<ConcertSuggestionEntity[]>;

	public abstract create$(concert: ConcertDraft): Observable<ConcertEntity>;
	/**
	 * Saves an edit. The stored concert goes in beside the draft, not only its
	 * id: the form holds what an admin may change, and everything else — where
	 * the concert came from, the artist photo, the mbids, the bill — belongs to
	 * the document and has to survive the edit.
	 */
	public abstract update$(
		concert: ConcertEntity,
		draft: ConcertDraft
	): Observable<ConcertEntity>;
	public abstract delete$(concert: ConcertEntity): Observable<void>;

	/**
	 * Files a suggestion as a concert and marks it decided, in one batch: a
	 * suggestion that was approved but stayed pending would be offered again.
	 *
	 * With a draft beside it when an admin corrected the night before letting
	 * it through; without one the suggestion is filed as the model wrote it.
	 */
	public abstract approve$(
		suggestion: ConcertSuggestionEntity,
		draft?: ConcertDraft
	): Observable<ConcertEntity>;
	/**
	 * Marks a suggestion rejected. It is kept, not deleted — that is what stops
	 * the next load proposing the same night again.
	 */
	public abstract reject$(
		suggestion: ConcertSuggestionEntity
	): Observable<void>;

	/**
	 * Catalog artists whose name begins with the typed text, for the act rows
	 * of the concert form.
	 *
	 * Asked of the server rather than of the cached catalog: this page reads
	 * concerts, and holding every band in memory to answer a few keystrokes
	 * would be a far bigger download than the handful of documents a search
	 * costs.
	 */
	public abstract searchArtists$(
		term: string
	): Observable<ConcertArtistMatch[]>;

	/** MusicBrainz events for the catalog's artists (server work). */
	public abstract load$(
		input: LoadConcertsInput
	): Observable<LoadConcertsResult>;
	/** What a Vertex model proposes for the catalog's artists (server work). */
	public abstract suggest$(
		input: SuggestConcertsInput
	): Observable<SuggestConcertsResult>;

	/** What the AI run is allowed to do, as the server holds it. */
	public abstract readSettings$(): Observable<ConcertAiSettings>;
	public abstract writeSettings$(
		settings: ConcertAiSettings
	): Observable<ConcertAiSettings>;
}
