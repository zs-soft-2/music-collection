import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { LabelStateService } from '@music-collection/api';

@Injectable()
export class LabelListPageResolverService implements Resolve<void> {
	constructor(private labelStateService: LabelStateService) {}

	public resolve(): void {
		this.labelStateService.dispatchListEntitiesAction();
		this.labelStateService.dispatchSetSelectedEntityIdAction('');
		this.labelStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
