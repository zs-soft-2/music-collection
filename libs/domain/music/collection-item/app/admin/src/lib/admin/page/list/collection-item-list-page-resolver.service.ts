import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { CollectionItemStateService } from '@music-collection/api';

@Injectable()
export class CollectionItemListPageResolverService implements Resolve<void> {
	private collectionItemStateService = inject(CollectionItemStateService);

	public resolve(): void {
		// The list opens on the collection items themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.collectionItemStateService.dispatchListEntitiesAction();
		this.collectionItemStateService.dispatchSetSelectedEntityIdAction('');
		this.collectionItemStateService.dispatchChangeNewEntityButtonEnabled(
			true
		);
	}
}
