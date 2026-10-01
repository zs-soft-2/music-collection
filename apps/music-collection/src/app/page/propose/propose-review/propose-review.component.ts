import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_REQUEST_NOTE_LENGTH } from '@music-collection/common/api';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';

import {
	Crumb,
	PageBreadcrumbComponent,
} from '../../../shared/page-breadcrumb';
import { ProposeReviewStore } from './propose-review.store';

/**
 * What backs the change: one box per field the collector altered.
 *
 * They are asked for one thing per field — a link, a scan, or their own words
 * — and not asked to say what kind of thing it is: a link is a link, and
 * making someone classify their own evidence is a way of not getting it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ProposeReviewStore],
	selector: 'mc-propose-review',
	templateUrl: './propose-review.component.html',
	styleUrls: ['./propose-review.component.scss'],
	imports: [...I18N_IMPORTS, PageBreadcrumbComponent, RouterLink],
})
export class ProposeReviewComponent {
	protected readonly store = inject(ProposeReviewStore);

	protected readonly noteMaxLength = MAX_REQUEST_NOTE_LENGTH;

	private readonly text = inject(TextService);

	protected readonly trail = computed<Crumb[]>(() => [
		{ label: this.text.translator()('page.propose.suggest-a-change') },
	]);

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}
}
