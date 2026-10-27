import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

@Injectable()
export class DocumentListPageResolverService implements Resolve<void> {
	private documentStateService = inject(DocumentStateService);

	public resolve(): void {
		// The list opens on the documents themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.documentStateService.dispatchListEntitiesAction();
		this.documentStateService.dispatchSetSelectedEntityIdAction('');
		this.documentStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
