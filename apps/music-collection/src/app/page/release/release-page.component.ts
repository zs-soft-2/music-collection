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
		...I18N_IMPORTS,
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
				labelKey: 'fact.album',
				value: pressing?.albumName ?? null,
				link: pressing?.albumUid ? ['/album', pressing.albumUid] : null,
			},
			{
				labelKey: 'fact.artist',
				value: pressing?.artistName ?? null,
				link: pressing?.artistUid
					? ['/artist', pressing.artistUid]
					: null,
			},
			{
				labelKey: 'fact.label',
				value: pressing?.labelName ?? null,
				link: pressing?.labelUid ? ['/label', pressing.labelUid] : null,
			},
			{ labelKey: 'fact.country', value: pressing?.country ?? null },
			{
				labelKey: 'fact.format',
				value: pressing?.formatDescription ?? null,
			},
			{
				labelKey: 'fact.released',
				value: releasedAt
					? this.datePipe.transform(releasedAt, 'longDate')
					: null,
			},
			{
				labelKey: 'fact.discogs',
				value: this.store.discogsUrl() ? 'Open the pressing' : null,
				href: this.store.discogsUrl(),
			},
		];
	});
}
