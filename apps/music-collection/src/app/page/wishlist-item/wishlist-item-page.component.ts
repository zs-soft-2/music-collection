import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminEditLinkComponent,
	FormatBadgeComponent,
} from '../../shared/music-ui';
import { EntityFact, EntityFactsComponent } from '../../shared/entity-view';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';
import { WishlistItemPageStore } from './wishlist-item-page.store';

/** The wish page: one record someone is after, and what would answer it. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DatePipe, WishlistItemPageStore],
	selector: 'mc-wishlist-item-page',
	templateUrl: './wishlist-item-page.component.html',
	styleUrls: ['./wishlist-item-page.component.scss'],
	imports: [
		PageBreadcrumbComponent,
		RouterLink,
		EntityFactsComponent,
		FormatBadgeComponent,
		AdminEditLinkComponent,
	],
})
export class WishlistItemPageComponent {
	private readonly datePipe = inject(DatePipe);

	protected readonly store = inject(WishlistItemPageStore);

	protected readonly facts = computed<EntityFact[]>(() => {
		const album = this.store.album();
		const artist = this.store.artist();
		const item = this.store.item();
		const medias = this.store.medias();

		return [
			{
				label: 'Album',
				value: album?.name ?? null,
				link: album?.uid ? ['/album', album.uid] : null,
			},
			{
				label: 'Artist',
				value: artist?.name ?? null,
				link: artist?.uid ? ['/artist', artist.uid] : null,
			},
			{
				label: 'Wanted on',
				value: medias.length ? medias.join(', ') : 'Any format',
			},
			{ label: 'Collector', value: this.store.collector() },
			{
				label: 'Where it was seen',
				value: item?.sourceLink ? 'Open the offer' : null,
				href: item?.sourceLink ?? null,
			},
			{
				label: 'Last change',
				value: item?.updatedAt
					? this.datePipe.transform(item.updatedAt, 'medium')
					: null,
			},
		];
	});
}
