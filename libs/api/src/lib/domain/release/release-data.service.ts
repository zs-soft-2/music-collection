import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from './release';

export abstract class ReleaseDataService extends EntityDataService<
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<ReleaseModel[]>;
	public abstract search$(query: string): Observable<ReleaseModel[]>;
}
