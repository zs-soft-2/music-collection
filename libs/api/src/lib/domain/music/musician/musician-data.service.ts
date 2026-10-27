import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import {
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
} from './musician';
import { MusicianExternalProfile } from './musician-external';

export abstract class MusicianDataService extends FirebaseDataService<
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate
> {
	/** The Discogs profile of the artist id; errors when not found. */
	public abstract fetchExternalProfile$(
		discogsId: number
	): Observable<MusicianExternalProfile>;
}
