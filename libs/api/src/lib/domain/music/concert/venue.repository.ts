import { Observable } from 'rxjs';

import {
	LoadVenuesResult,
	SuggestVenuesInput,
	SuggestVenuesResult,
} from './concert-load';
import {
	VenueDraft,
	VenueEntity,
	VenueSuggestionEntity,
	VenueUsage,
} from './venue';

/**
 * Data access for the venues. The application binds the Firestore
 * implementation; what reads a venue knows only this.
 */
export abstract class VenueRepository {
	/** Every venue, kept current as an admin edits them. */
	public abstract list$(): Observable<VenueEntity[]>;
	/** The venues a model proposed, pending and rejected both. */
	public abstract suggestions$(): Observable<VenueSuggestionEntity[]>;
	public abstract create$(venue: VenueDraft): Observable<VenueEntity>;
	/**
	 * Saves an edit. The stored venue goes in beside the draft, not only its
	 * id: the form holds what an admin may change, and everything else — the
	 * MusicBrainz id, where the venue came from, the day it closed — belongs to
	 * the document and has to survive the edit. A loaded venue whose edit lost
	 * its `source` would be overwritten by the next load.
	 */
	public abstract update$(
		venue: VenueEntity,
		draft: VenueDraft
	): Observable<VenueEntity>;
	/**
	 * Takes the venue off the forms, or puts it back. One field, so it is one
	 * write rather than a trip through the editor: this is the answer to a
	 * venue that may not be deleted.
	 */
	public abstract retire$(
		venue: VenueEntity,
		active: boolean
	): Observable<void>;
	public abstract delete$(venue: VenueEntity): Observable<void>;
	/**
	 * What is filed at the venue. One count, from the server: the number is
	 * what the delete dialogue says, and what it turns on.
	 */
	public abstract usage$(uid: string): Observable<VenueUsage>;
	/** Loads the country's places from MusicBrainz (server work). */
	public abstract load$(countryCode: string): Observable<LoadVenuesResult>;
	/** What a model proposes as a country's venues (server work, paid). */
	public abstract suggest$(
		input: SuggestVenuesInput
	): Observable<SuggestVenuesResult>;
	/**
	 * Files a proposed venue and marks the proposal decided, in one batch: a
	 * proposal that was approved but stayed pending would be offered again.
	 *
	 * With a draft beside it when an admin corrected the place before letting
	 * it through; without one it is filed as the model wrote it.
	 */
	public abstract approveSuggestion$(
		suggestion: VenueSuggestionEntity,
		draft?: VenueDraft
	): Observable<VenueEntity>;
	/**
	 * Marks a proposal rejected. It is kept, not deleted — that is what stops
	 * the next run proposing the same hall again.
	 */
	public abstract rejectSuggestion$(
		suggestion: VenueSuggestionEntity
	): Observable<void>;
}
