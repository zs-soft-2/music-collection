import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';

@Injectable()
export class ReleaseListPageResolverService implements Resolve<void> {
	private releaseStateService = inject(ReleaseStateService);

	public resolve(): void {
		// The list opens on the releases themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.releaseStateService.dispatchListEntitiesAction();
		this.releaseStateService.dispatchSetSelectedEntityIdAction('');
		this.releaseStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
