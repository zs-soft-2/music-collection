import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { CollectionItemStateService } from '@music-collection/api';

@Injectable()
export class CollectionItemEditResolverService implements Resolve<void> {
	private collectionItemStateService = inject(CollectionItemStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.collectionItemStateService.dispatchChangeNewEntityButtonEnabled(
			false
		);
	}
}
