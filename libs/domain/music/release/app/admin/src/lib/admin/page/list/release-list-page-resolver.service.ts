import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';

@Injectable()
export class ReleaseListPageResolverService implements Resolve<void> {
	private releaseStateService = inject(ReleaseStateService);


	public resolve(): void {
		this.releaseStateService.dispatchSetSelectedEntityIdAction('');
		this.releaseStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
