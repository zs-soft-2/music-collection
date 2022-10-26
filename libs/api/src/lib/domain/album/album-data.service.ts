import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { AlbumEntity, AlbumEntityAdd, AlbumEntityUpdate } from './album';

export abstract class AlbumDataService extends EntityDataService<
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate
> {
	public abstract listByIds$(ids: string[]): Observable<AlbumEntity[]>;
	public abstract search$(query: string): Observable<AlbumEntity[]>;
}
