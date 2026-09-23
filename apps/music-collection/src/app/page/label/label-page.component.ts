import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminEditLinkComponent,
	FormatBadgeComponent,
} from '../../shared/music-ui';
import { EntityFact, EntityFactsComponent } from '../../shared/entity-view';
import { LabelPageStore } from './label-page.store';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';

/** Artists shown before "Show all" — a label may have put out hundreds. */
const ARTIST_PREVIEW = 24;

/** Pressings shown before "Show all". */
const PRESSING_PREVIEW = 48;

/**
 * The label page: a record company as the catalog knows it — the labels
 * under it, the artists it put out and every pressing that carries its name.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelPageStore],
	selector: 'mc-label-page',
	templateUrl: './label-page.component.html',
	styleUrls: ['./label-page.component.scss'],
	imports: [
		PageBreadcrumbComponent,
		RouterLink,
		EntityFactsComponent,
		FormatBadgeComponent,
		AdminEditLinkComponent,
	],
})
export class LabelPageComponent {
	protected readonly store = inject(LabelPageStore);

	protected readonly showAllArtists = signal(false);
	protected readonly showAllPressings = signal(false);

	protected readonly monogram = computed(() =>
		(this.store.name() || '?').charAt(0).toUpperCase()
	);

	protected readonly visibleArtists = computed(() =>
		this.showAllArtists()
			? this.store.artists()
			: this.store.artists().slice(0, ARTIST_PREVIEW)
	);

	protected readonly visiblePressings = computed(() =>
		this.showAllPressings()
			? this.store.pressings()
			: this.store.pressings().slice(0, PRESSING_PREVIEW)
	);

	public constructor() {
		// Moving to another label (a sub-label, say) reuses this page.
		effect(() => {
			this.store.labelId();
			untracked(() => {
				this.showAllArtists.set(false);
				this.showAllPressings.set(false);
			});
		});
	}

	protected readonly facts = computed<EntityFact[]>(() => {
		const parent = this.store.parent();
		const years = this.store.years();

		return [
			{
				label: 'Parent label',
				value: parent?.name ?? null,
				link: parent ? ['/label', parent.uid] : null,
			},
			{
				label: 'Sub-labels',
				value: this.store.children().length || null,
			},
			{
				label: 'Pressings',
				value: this.store.pressings().length || null,
			},
			{ label: 'Artists', value: this.store.artists().length || null },
			{
				label: 'Years',
				value: years
					? years.from === years.to
						? `${years.from}`
						: `${years.from} – ${years.to}`
					: null,
			},
		];
	});
}
