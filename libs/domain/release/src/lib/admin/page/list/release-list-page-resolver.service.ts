import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';

@Injectable()
export class ReleaseListPageResolverService implements Resolve<void> {
	constructor(private releaseStateService: ReleaseStateService) {}

	public resolve(): void {
		this.releaseStateService.dispatchListEntitiesAction();
		this.releaseStateService.dispatchSetSelectedEntityIdAction('');
		this.releaseStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
