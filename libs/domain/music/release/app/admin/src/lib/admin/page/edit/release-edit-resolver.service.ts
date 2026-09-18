import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';

@Injectable()
export class ReleaseEditResolverService implements Resolve<void> {
	private releaseStateService = inject(ReleaseStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.releaseStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
