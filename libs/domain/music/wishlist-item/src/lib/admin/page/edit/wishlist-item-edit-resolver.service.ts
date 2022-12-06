import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

@Injectable()
export class WishlistItemEditResolverService implements Resolve<void> {
	public constructor(
		private wishlistItemStateService: WishlistItemStateService
	) {}

	public resolve(): void | Observable<void> | Promise<void> {
		this.wishlistItemStateService.dispatchChangeNewEntityButtonEnabled(
			false
		);
	}
}
