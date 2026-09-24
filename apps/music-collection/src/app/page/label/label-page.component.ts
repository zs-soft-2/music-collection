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
import { I18N_IMPORTS } from '@music-collection/core/i18n';

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
		...I18N_IMPORTS,
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
				labelKey: 'fact.parentLabel',
				value: parent?.name ?? null,
				link: parent ? ['/label', parent.uid] : null,
			},
			{
				labelKey: 'fact.subLabels',
				value: this.store.children().length || null,
			},
			{
				labelKey: 'fact.pressings',
				value: this.store.pressings().length || null,
			},
			{
				labelKey: 'fact.artists',
				value: this.store.artists().length || null,
			},
			{
				labelKey: 'fact.years',
				value: years
					? years.from === years.to
						? `${years.from}`
						: `${years.from} – ${years.to}`
					: null,
			},
		];
	});
}
