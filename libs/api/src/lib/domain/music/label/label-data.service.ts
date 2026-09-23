import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { LabelModel, LabelModelAdd, LabelModelUpdate } from './label';
import { LabelExternalCandidate, LabelExternalProfile } from './label-external';

export abstract class LabelDataService extends FirebaseDataService<
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate
> {
	/** The Discogs profile of a label id. */
	public abstract fetchExternalProfile$(
		discogsId: number
	): Observable<LabelExternalProfile>;
	/** The Discogs labels carrying the searched name. */
	public abstract searchExternalLabels$(
		name: string
	): Observable<LabelExternalCandidate[]>;
}
