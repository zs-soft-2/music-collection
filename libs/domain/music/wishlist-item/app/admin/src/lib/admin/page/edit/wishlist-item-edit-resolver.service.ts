import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

@Injectable()
export class WishlistItemEditResolverService implements Resolve<void> {
	private wishlistItemStateService = inject(WishlistItemStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.wishlistItemStateService.dispatchChangeNewEntityButtonEnabled(
			false
		);
	}
}
