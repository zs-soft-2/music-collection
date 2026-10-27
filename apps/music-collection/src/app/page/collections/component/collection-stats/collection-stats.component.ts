import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionCrowd } from '../../../collectors/collectors.model';
import { CollectionCardView } from '../../collections.model';

/**
 * Where the shelf stands on this collection, in six numbers.
 *
 * The header already says the same things in sentences; this is the row a
 * reader scans rather than reads, and the one that makes two collections
 * comparable at a glance.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-stats',
	imports: [...I18N_IMPORTS],
	template: `
		@let item = collection();
		@let who = crowd();

		<dl class="stats">
			<!--
				A három saját szám csak annak szól, akinek van polca; vendégnek
				a helyükön az áll, amit a kollekció kér.
			-->
			@if (signedIn()) {
				<div class="stat">
					<dt>
						{{ 'ui.collectionDetailPage.stat.owned' | transloco }}
					</dt>
					<dd>{{ item.owned | mcNumber }}</dd>
				</div>
				<div class="stat">
					<dt>
						{{ 'ui.collectionDetailPage.stat.missing' | transloco }}
					</dt>
					<dd>{{ item.missing | mcNumber }}</dd>
				</div>
				<div class="stat">
					<dt>
						{{ 'ui.collectionDetailPage.stat.done' | transloco }}
					</dt>
					<dd>{{ item.percentage }}%</dd>
				</div>
			} @else {
				<div class="stat">
					<dt>
						{{ 'ui.collectionDetailPage.stat.records' | transloco }}
					</dt>
					<dd>{{ item.total | mcNumber }}</dd>
				</div>
			}
			<div class="stat is-points">
				<dt>{{ 'ui.collectionDetailPage.stat.points' | transloco }}</dt>
				<dd>{{ item.points | mcNumber }}</dd>
			</div>
			<div class="stat">
				<dt>
					{{ 'ui.collectionDetailPage.stat.finishers' | transloco }}
				</dt>
				<dd>{{ who.finisherCount }}</dd>
			</div>
			<div class="stat">
				<dt>
					{{ 'ui.collectionDetailPage.stat.hunters' | transloco }}
				</dt>
				<dd>{{ who.hunterCount }}</dd>
			</div>
		</dl>
	`,
	styles: `
		:host {
			display: block;
		}

		.stats {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
			gap: 0.75rem;
			margin: 0;
		}

		.stat {
			padding: 0.8rem 1rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			dt {
				font-size: 0.7rem;
				font-weight: 700;
				letter-spacing: 0.12em;
				text-transform: uppercase;
				color: var(--mc-text-subtle);
			}

			dd {
				margin: 0.25rem 0 0;
				font-family: var(--mc-font-display);
				font-size: 1.6rem;
				line-height: 1;
				font-variant-numeric: tabular-nums;
			}

			&.is-points dd {
				color: var(--mc-accent);
			}
		}
	`,
})
export class CollectionStatsComponent {
	public readonly collection = input.required<CollectionCardView>();
	public readonly crowd = input.required<CollectionCrowd>();
	/**
	 * Whether there is a collector behind this reader. A guest has no shelf
	 * these numbers could be about, and three zeroes read as a collection
	 * nobody got anywhere with rather than as nobody being signed in.
	 */
	public readonly signedIn = input(true);
}
