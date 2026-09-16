import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	FormatBadgeComponent,
	ReleaseCardComponent,
} from '../../../../shared/music-ui';
import { WishlistPageStore } from '../../wishlist-page.store';

/** The albums the user is looking for, as release cards with a shop link. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistPageStore],
	selector: 'mc-wishlist-page',
	templateUrl: './wishlist-page.component.html',
	styleUrls: ['./wishlist-page.component.scss'],
	imports: [RouterLink, ReleaseCardComponent, FormatBadgeComponent],
})
export class WishlistPageComponent {
	protected readonly store = inject(WishlistPageStore);

	protected readonly skeletons = Array.from({ length: 12 }, (_, i) => i);

	protected onQuery(event: Event): void {
		this.store.setQuery((event.target as HTMLInputElement).value);
	}
}
