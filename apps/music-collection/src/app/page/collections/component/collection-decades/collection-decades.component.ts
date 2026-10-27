import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionDecadeView } from '../../collections.model';

/**
 * The collection across the decades, and the gap in it.
 *
 * It answers what the counts cannot: where the missing records are. A
 * collector two thirds of the way through a set usually has the famous
 * decade whole and barely any of the one before it, and that is the trip to
 * the shop worth making. The whole column is the collection's records of
 * that decade; the filled part is the shelf.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-decades',
	imports: [...I18N_IMPORTS],
	template: `
		<h2 class="panel-title">
			{{ 'ui.collectionDetailPage.decades.title' | transloco }}
		</h2>
		<p class="panel-lead">
			{{ 'ui.collectionDetailPage.decades.lead' | transloco }}
		</p>

		<ul class="decades">
			@for (decade of decades(); track decade.label) {
				<li
					class="decade"
					[attr.aria-label]="
						'ui.collectionDetailPage.decades.one'
							| transloco
								: {
										decade: decade.label,
										owned: decade.owned,
										total: decade.total,
								  }
					"
				>
					<span class="column" aria-hidden="true">
						<span class="total" [style.height.%]="decade.height">
							<span
								class="owned"
								[style.height.%]="decade.share"
							></span>
						</span>
					</span>
					<span class="tick" aria-hidden="true">{{
						decade.short
					}}</span>
					<span class="count" aria-hidden="true"
						>{{ decade.owned }}/{{ decade.total }}</span
					>
				</li>
			}
		</ul>
	`,
	styles: `
		:host {
			display: block;
		}

		.panel-title {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.panel-lead {
			margin: 0.45rem 0 0;
			font-size: 0.8rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
		}

		.decades {
			display: flex;
			align-items: flex-end;
			gap: 0.3rem;
			height: 7rem;
			margin: 0.9rem 0 0;
			padding: 0;
			list-style: none;
		}

		.decade {
			display: flex;
			min-width: 0;
			flex: 1;
			flex-direction: column;
			align-items: center;
			justify-content: flex-end;
			gap: 0.25rem;
			height: 100%;
		}

		.column {
			display: flex;
			width: 100%;
			flex: 1;
			align-items: flex-end;
		}

		.total {
			display: flex;
			width: 100%;
			min-height: 2px;
			align-items: flex-end;
			background: var(--mc-surface-2);
			border-radius: 3px;
		}

		.owned {
			width: 100%;
			min-height: 2px;
			background: var(--mc-primary);
			border-radius: 3px;
		}

		.tick,
		.count {
			font-size: 0.62rem;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.count {
			font-size: 0.6rem;
		}
	`,
})
export class CollectionDecadesComponent {
	public readonly decades = input.required<CollectionDecadeView[]>();
}
