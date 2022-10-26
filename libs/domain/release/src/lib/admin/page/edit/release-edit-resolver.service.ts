import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ReleaseStateService } from '@music-collection/api';

@Injectable()
export class ReleaseEditResolverService implements Resolve<void> {
	public constructor(private releaseStateService: ReleaseStateService) {}

	public resolve(): void | Observable<void> | Promise<void> {
		this.releaseStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
