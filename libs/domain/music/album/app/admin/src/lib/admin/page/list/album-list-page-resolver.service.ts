import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

@Injectable()
export class AlbumListPageResolverService implements Resolve<void> {
	private albumStateService = inject(AlbumStateService);

	public resolve(): void {
		// The list opens on the albums themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.albumStateService.dispatchListEntitiesAction();
		this.albumStateService.dispatchSetSelectedEntityIdAction('');
		this.albumStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
