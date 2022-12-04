import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity } from '../album';
import {
	WhislistItemEntity,
	WhislistItemEntityAdd,
	WhislistItemEntityUpdate,
} from './whislist-item';

export abstract class WhislistItemStateService extends EntityStateService<
	WhislistItemEntity,
	WhislistItemEntityAdd,
	WhislistItemEntityUpdate
> {
	public abstract dispatchListAlbumsByIdAction(uid: string): void;
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSelectWhislistItemAction(
		whislistItem: WhislistItemEntity
	): void;
	public abstract selectAlbumsById$(
		whislistItemId: string
	): Observable<AlbumEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<WhislistItemEntity[]>;
}
