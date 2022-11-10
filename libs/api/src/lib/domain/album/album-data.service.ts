import { Observable } from 'rxjs';

import { EntityDataService, SearchParams } from '../../common';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from './album';

export abstract class AlbumDataService extends EntityDataService<
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<AlbumModel[]>;
	public abstract search$(params: SearchParams): Observable<AlbumModel[]>;
}
