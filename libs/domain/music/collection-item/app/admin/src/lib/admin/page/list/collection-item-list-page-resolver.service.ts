import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { CollectionItemStateService } from '@music-collection/api';

@Injectable()
export class CollectionItemListPageResolverService implements Resolve<void> {
	private collectionItemStateService = inject(CollectionItemStateService);


	public resolve(): void {
		this.collectionItemStateService.dispatchSetSelectedEntityIdAction('');
		this.collectionItemStateService.dispatchChangeNewEntityButtonEnabled(
			true
		);
	}
}
