import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	DecadeChartComponent,
	DonutChartComponent,
	ProgressRingComponent,
	ReleaseCardComponent,
	SparklineComponent,
	StyleBarsComponent,
} from '../../shared/music-ui';
import { OverviewPageStore } from './overview-page.store';
import { RECENT_WINDOW_DAYS } from './overview.model';

/**
 * The collection in one screen: four headline numbers, what the shelf is
 * made of, what arrived lately and how far the collector is along the
 * collections they follow.
 *
 * Everything here is a summary of something that has its own page — the
 * numbers are links, not destinations. What the page must not become is a
 * second collection page: nothing on it is filtered, sorted or edited.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [OverviewPageStore],
	selector: 'mc-overview-page',
	templateUrl: './overview-page.component.html',
	styleUrls: ['./overview-page.component.scss'],
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		DecadeChartComponent,
		DonutChartComponent,
		ProgressRingComponent,
		ReleaseCardComponent,
		SparklineComponent,
		StyleBarsComponent,
	],
})
export class OverviewPageComponent {
	protected readonly store = inject(OverviewPageStore);
	protected readonly recentDays = RECENT_WINDOW_DAYS;
}
