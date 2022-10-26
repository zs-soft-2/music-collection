import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from './release';

export abstract class ReleaseStateService extends EntityStateService<
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSearch(term: string): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<ReleaseEntity[]>;
}
