import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';

import { Crumb, PageBreadcrumbComponent } from '../../shared/page-breadcrumb';
import { focusOnClose } from '../../shared/dialog-focus';
import {
	CopyRemovalComponent,
	FormatBadgeComponent,
	StarRatingComponent,
} from '../../shared/music-ui';
import {
	CollectionItemPageStore,
	CopyDraft,
} from './collection-item-page.store';
import { CopyDetailsFormComponent } from './component/copy-details-form';
import { CopyPhotosComponent } from './component/copy-photos';
import { CoverFallbackDirective } from '../../shared/image';

/**
 * The copy page: one record, on one shelf, in one collection.
 *
 * It reads the way the records are actually filed — the album is the work,
 * the release is the pressing that work came out on, and the copy is the
 * object itself. Each section adds only what the layer above it cannot know,
 * which is why the album's own tracklist lives on the album page and what
 * this pressing added lives here.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemPageStore],
	selector: 'mc-collection-item-page',
	templateUrl: './collection-item-page.component.html',
	styleUrls: ['./collection-item-page.component.scss'],
	imports: [
		CoverFallbackDirective,
		...I18N_IMPORTS,
		PageBreadcrumbComponent,
		RouterLink,
		FormatBadgeComponent,
		CopyRemovalComponent,
		CopyPhotosComponent,
		CopyDetailsFormComponent,
		StarRatingComponent,
		DatePipe,
	],
})
export class CollectionItemPageComponent {
	protected readonly store = inject(CollectionItemPageStore);
	private readonly text = inject(TextService);

	protected readonly trail = computed((): Crumb[] => {
		const album = this.store.album();

		return [
			{
				label: this.text.translator()('nav.collection'),
				link: '/collection',
			},
			{ label: album?.title ?? 'Copy' },
		];
	});

	public constructor() {
		// Back from the removal dialog: focus the button it was opened from.
		// A copy let go of no longer has one, so the heading of the section it
		// stood in takes the focus and the reading starts at this copy.
		focusOnClose(this.store.removingCopyId, (copyId) => [
			`[data-remove-copy="${copyId}"]`,
			'[data-copy-heading]',
		]);
	}

	protected save(draft: CopyDraft): void {
		// The store takes the copy's number from the registry before it writes,
		// which is a round trip; the page has nothing to do while it waits.
		void this.store.save(draft);
	}
}
