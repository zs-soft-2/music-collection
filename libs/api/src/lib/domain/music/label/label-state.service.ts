import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { LabelEntity, LabelEntityAdd, LabelEntityUpdate } from './label';
import { LabelExternalCandidate, LabelExternalProfile } from './label-external';

export abstract class LabelStateService extends EntityStateService<
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	/** The Discogs profile of a label id. */
	public abstract fetchExternalProfile$(
		discogsId: number
	): Observable<LabelExternalProfile>;
	/** The Discogs labels carrying the searched name. */
	public abstract searchExternalLabels$(
		name: string
	): Observable<LabelExternalCandidate[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<LabelEntity[]>;
}
