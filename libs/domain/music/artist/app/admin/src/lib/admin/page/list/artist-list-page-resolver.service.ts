import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';

@Injectable()
export class ArtistListPageResolverService implements Resolve<void> {
	private artistStateService = inject(ArtistStateService);

	public resolve(): void {
		// The list opens on the artists themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.artistStateService.dispatchListEntitiesAction();
		this.artistStateService.dispatchSetSelectedEntityIdAction('');
		this.artistStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
