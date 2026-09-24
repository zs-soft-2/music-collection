import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

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
		...I18N_IMPORTS,
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
				labelKey: 'fact.album',
				value: album?.name ?? null,
				link: album?.uid ? ['/album', album.uid] : null,
			},
			{
				labelKey: 'fact.artist',
				value: artist?.name ?? null,
				link: artist?.uid ? ['/artist', artist.uid] : null,
			},
			{
				labelKey: 'fact.wantedOn',
				value: medias.length ? medias.join(', ') : 'Any format',
			},
			{ labelKey: 'fact.collector', value: this.store.collector() },
			{
				labelKey: 'fact.whereSeen',
				value: item?.sourceLink ? 'Open the offer' : null,
				href: item?.sourceLink ?? null,
			},
			{
				labelKey: 'fact.lastChange',
				value: item?.updatedAt
					? this.datePipe.transform(item.updatedAt, 'medium')
					: null,
			},
		];
	});
}
