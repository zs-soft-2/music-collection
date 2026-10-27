import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { LabelStateService } from '@music-collection/api';

@Injectable()
export class LabelListPageResolverService implements Resolve<void> {
	private labelStateService = inject(LabelStateService);

	public resolve(): void {
		// The list opens on the labels themselves, not on an empty table
		// waiting for a search: the catalog comes from the local cache.
		this.labelStateService.dispatchListEntitiesAction();
		this.labelStateService.dispatchSetSelectedEntityIdAction('');
		this.labelStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
