import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';

export abstract class ArtistDataService extends EntityDataService<
  ArtistEntity,
  ArtistEntityAdd,
  ArtistEntityUpdate
> {
  public abstract listByIds$(ids: string[]): Observable<ArtistEntity[]>;
}
