import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { CollectionItemStateService } from '@music-collection/api';

@Injectable()
export class CollectionItemEditResolverService implements Resolve<void> {
	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {}

	public resolve(): void | Observable<void> | Promise<void> {
		this.collectionItemStateService.dispatchChangeNewEntityButtonEnabled(
			false
		);
	}
}
