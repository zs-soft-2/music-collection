import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from './release';

export abstract class ReleaseDataService extends EntityDataService<
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<ReleaseEntity[]>;
	public abstract search$(query: string): Observable<ReleaseEntity[]>;
}
