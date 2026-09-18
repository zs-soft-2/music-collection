import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import { CountDatum } from '../count-stats';

/**
 * Single-series horizontal bar chart. Every bar carries its value at the tip,
 * so the numbers are readable without hovering.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-style-bars',
	template: `
		<figure class="chart">
			<figcaption class="title">{{ title() }}</figcaption>

			<ul class="bars">
				@for (row of rows(); track row.label) {
					<li
						class="row"
						[attr.aria-label]="
							row.label + ': ' + row.count + ' releases'
						"
					>
						<span class="label" aria-hidden="true">{{
							row.label
						}}</span>
						<span class="track" aria-hidden="true">
							<span
								class="bar"
								[style.width.%]="row.width"
							></span>
							<span class="value">{{ row.count }}</span>
						</span>
					</li>
				}
			</ul>
		</figure>
	`,
	styles: `
		:host {
			display: block;
		}

		.chart {
			margin: 0;
		}

		.title {
			margin-bottom: 1rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.bars {
			display: flex;
			flex-direction: column;
			gap: 0.7rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.row {
			display: grid;
			grid-template-columns: minmax(6rem, 38%) minmax(0, 1fr);
			gap: 0.75rem;
			align-items: center;
		}

		.label {
			overflow: hidden;
			font-size: 0.85rem;
			color: var(--mc-text);
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.track {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			min-width: 0;
		}

		.bar {
			height: 12px;
			min-width: 2px;
			background: var(--mc-chart);
			border-radius: 0 4px 4px 0;
		}

		.value {
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}
	`,
})
export class StyleBarsComponent {
	public readonly title = input.required<string>();
	public readonly data = input.required<CountDatum[]>();

	protected readonly rows = computed(() => {
		const data = this.data();
		const max = Math.max(1, ...data.map((datum) => datum.count));

		/* Leave room for the value label at the tip of the longest bar. */
		return data.map((datum) => ({
			...datum,
			width: (datum.count / max) * 85,
		}));
	});
}
