import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { LabelEntity, LabelEntityAdd, LabelEntityUpdate } from './label';

export abstract class LabelDataService extends EntityDataService<
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<LabelEntity[]>;
	public abstract search$(query: string): Observable<LabelEntity[]>;
}
