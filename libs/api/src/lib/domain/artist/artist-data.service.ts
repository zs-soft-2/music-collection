import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { ArtistModel, ArtistModelAdd, ArtistModelUpdate } from './artist';

export abstract class ArtistDataService extends EntityDataService<
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<ArtistModel[]>;
	public abstract search$(query: string): Observable<ArtistModel[]>;
}
