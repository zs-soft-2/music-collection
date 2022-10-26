import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import { LabelEntity, LabelEntityAdd, LabelEntityUpdate } from './label';

export abstract class LabelStateService extends EntityStateService<
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSearch(term: string): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<LabelEntity[]>;
}
