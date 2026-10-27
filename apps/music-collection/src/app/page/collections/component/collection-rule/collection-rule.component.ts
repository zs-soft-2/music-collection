import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionRuleRow } from '../../collections.model';

/**
 * What the rule asks for, line by line.
 *
 * The most interesting thing about a collection is why these records and
 * not others — it is what makes the set grow by itself as the catalog does,
 * and what tells a reader whether it is a collection for them. What the
 * rule keeps out is shown struck through rather than in a list of its own:
 * it is the same sentence with the sign reversed.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-rule',
	imports: [...I18N_IMPORTS],
	template: `
		<h2 class="panel-title">
			{{ 'ui.collectionDetailPage.rule.title' | transloco }}
		</h2>
		<p class="panel-lead">
			{{ 'ui.collectionDetailPage.rule.lead' | transloco }}
		</p>

		<dl class="rule">
			@for (row of rows(); track row.labelKey) {
				<div class="row" [class.is-excluded]="row.excluded">
					<dt>{{ row.labelKey | transloco }}</dt>
					<dd>
						@for (value of row.values; track value) {
							<span class="value">{{ value }}</span>
						}
					</dd>
				</div>
			}
		</dl>
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

		.rule {
			margin: 0.9rem 0 0;
		}

		.row {
			display: grid;
			gap: 0.25rem;
			padding: 0.5rem 0;
			border-top: 1px solid var(--mc-border);

			&:first-child {
				padding-top: 0;
				border-top: 0;
			}

			dt {
				font-size: 0.7rem;
				font-weight: 700;
				letter-spacing: 0.1em;
				text-transform: uppercase;
				color: var(--mc-text-subtle);
			}

			dd {
				display: flex;
				flex-wrap: wrap;
				gap: 0.3rem;
				margin: 0;
			}

			/* Amit kizár, azt áthúzva: ugyanaz a lista, fordított előjellel. */
			&.is-excluded .value {
				color: var(--mc-text-subtle);
				text-decoration: line-through;
			}
		}

		.value {
			padding: 0.15rem 0.5rem;
			font-size: 0.78rem;
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: 999px;
		}
	`,
})
export class CollectionRuleComponent {
	public readonly rows = input.required<CollectionRuleRow[]>();
}
