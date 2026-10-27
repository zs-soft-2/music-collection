import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * One line of an entity's facts. A fact with no value is left out rather
 * than shown empty: a record says nothing about what was never filled in.
 */
export interface EntityFact {
	/** Dictionary key of what the fact is called. */
	labelKey: string;
	value: string | number | null | undefined;
	/** Where the value leads when it stands for another record. */
	link?: unknown[] | null;
	/** An address outside the catalog — Discogs, a shop, a file. */
	href?: string | null;
}

/** The facts of an entity, as a two-column list. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-entity-facts',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<dl class="facts">
			@for (fact of shown(); track fact.labelKey) {
				<div class="fact">
					<dt>{{ fact.labelKey | transloco }}</dt>
					<dd>
						@if (fact.link) {
							<a [routerLink]="fact.link">{{ fact.value }}</a>
						} @else if (fact.href) {
							<a
								[href]="fact.href"
								target="_blank"
								rel="noopener noreferrer"
								>{{ fact.value }}</a
							>
						} @else {
							{{ fact.value }}
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

		.facts {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
			gap: 1rem 1.5rem;
			margin: 0;
		}

		.fact {
			min-width: 0;
		}

		dt {
			margin-bottom: 0.2rem;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		dd {
			margin: 0;
			overflow-wrap: anywhere;
			color: var(--mc-text);
		}

		a {
			color: inherit;
			text-decoration: none;
			border-bottom: 1px solid var(--mc-border-strong);

			&:hover {
				color: var(--mc-primary);
				border-color: currentcolor;
			}
		}
	`,
})
export class EntityFactsComponent {
	public readonly facts = input.required<EntityFact[]>();

	protected readonly shown = computed(() =>
		this.facts().filter(
			(fact) =>
				fact.value !== null &&
				fact.value !== undefined &&
				fact.value !== ''
		)
	);
}
