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
import { ReleasePageStore } from './release-page.store';

/**
 * The pressing page: one edition of an album, read next to its siblings.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DatePipe, ReleasePageStore],
	selector: 'mc-release-page',
	templateUrl: './release-page.component.html',
	styleUrls: ['./release-page.component.scss'],
	imports: [
		PageBreadcrumbComponent,
		RouterLink,
		EntityFactsComponent,
		FormatBadgeComponent,
		AdminEditLinkComponent,
	],
})
export class ReleasePageComponent {
	private readonly datePipe = inject(DatePipe);

	protected readonly store = inject(ReleasePageStore);

	protected readonly facts = computed<EntityFact[]>(() => {
		const pressing = this.store.pressing();
		const releasedAt = this.store.releasedAt();

		return [
			{
				label: 'Album',
				value: pressing?.albumName ?? null,
				link: pressing?.albumUid ? ['/album', pressing.albumUid] : null,
			},
			{
				label: 'Artist',
				value: pressing?.artistName ?? null,
				link: pressing?.artistUid
					? ['/artist', pressing.artistUid]
					: null,
			},
			{
				label: 'Label',
				value: pressing?.labelName ?? null,
				link: pressing?.labelUid ? ['/label', pressing.labelUid] : null,
			},
			{ label: 'Country', value: pressing?.country ?? null },
			{ label: 'Format', value: pressing?.formatDescription ?? null },
			{
				label: 'Released',
				value: releasedAt
					? this.datePipe.transform(releasedAt, 'longDate')
					: null,
			},
			{
				label: 'Discogs',
				value: this.store.discogsUrl() ? 'Open the pressing' : null,
				href: this.store.discogsUrl(),
			},
		];
	});
}
