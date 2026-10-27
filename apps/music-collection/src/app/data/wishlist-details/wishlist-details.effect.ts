import { Observable, combineLatest, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ReleaseEntity, WishlistItemEntity } from '@music-collection/api';

import { ReleaseDetailsEffect } from '../release-details';
import { WishlistItemRepository } from './wishlist-item.repository';

export interface WishlistDetails {
	item: WishlistItemEntity | null;
	/**
	 * The pressings of the wished album the catalog knows — what the wish
	 * could actually be answered with.
	 */
	pressings: ReleaseEntity[];
}

/**
 * Loads a wish and the pressings that would satisfy it. The wish is what the
 * page waits for; a wish stands without knowing what would answer it.
 */
@Injectable({ providedIn: 'root' })
export class WishlistDetailsEffect {
	private readonly releaseDetailsEffect = inject(ReleaseDetailsEffect);
	private readonly wishlistItemRepository = inject(WishlistItemRepository);

	public load$(itemUid: string): Observable<WishlistDetails> {
		return this.wishlistItemRepository.get$(itemUid).pipe(
			switchMap((item) =>
				item?.albumReference?.uid
					? combineLatest({
							item: of(item),
							pressings: this.releaseDetailsEffect.pressingsOf$(
								item.albumReference.uid
							),
						})
					: of({ item, pressings: [] as ReleaseEntity[] })
			)
		);
	}
}
