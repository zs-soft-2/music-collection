import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	LabelEntity,
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate,
} from './label';

export abstract class LabelDataService extends EntityDataService<
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<LabelEntity[]>;
	public abstract search$(query: string): Observable<LabelModel[]>;
}
