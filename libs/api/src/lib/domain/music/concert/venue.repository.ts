import { Observable } from 'rxjs';

import { LoadVenuesResult } from './concert-load';
import { VenueDraft, VenueEntity } from './venue';

/**
 * Data access for the venues. The application binds the Firestore
 * implementation; what reads a venue knows only this.
 */
export abstract class VenueRepository {
	/** Every venue, kept current as an admin edits them. */
	public abstract list$(): Observable<VenueEntity[]>;
	public abstract create$(venue: VenueDraft): Observable<VenueEntity>;
	public abstract update$(
		uid: string,
		venue: VenueDraft
	): Observable<VenueEntity>;
	public abstract delete$(venue: VenueEntity): Observable<void>;
	/**
	 * Whether any concert is filed at the venue. One read: the question is
	 * whether there is a first one, not how many.
	 */
	public abstract isInUse$(uid: string): Observable<boolean>;
	/** Loads the country's places from MusicBrainz (server work). */
	public abstract load$(countryCode: string): Observable<LoadVenuesResult>;
}
