import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { DecadeCoverage } from '../../home.mapper';

/**
 * Stacked column chart of the catalog albums per decade: the collected part
 * sits on the baseline in the chart color, the rest of the catalog stacks on
 * top in a light step of the same hue. Two series, so a legend names them;
 * every value is available on hover, on keyboard focus and to screen readers.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-catalog-coverage-chart',
	imports: [...I18N_IMPORTS],
	template: `
		<figure class="chart">
			<div class="head">
				<figcaption class="title">{{ heading() }}</figcaption>
				<ul class="legend" aria-hidden="true">
					<li>
						<span class="swatch is-collected"></span
						>{{
							'ui.catalogCoverageChart.in-my-collection'
								| transloco
						}}
					</li>
					<li>
						<span class="swatch is-catalog"></span
						>{{
							'ui.catalogCoverageChart.rest-of-the-catalog'
								| transloco
						}}
					</li>
				</ul>
			</div>

			<p class="summary">
				{{
					'ui.catalogCoverageChart.summary'
						| transloco
							: {
									collected: total().collected,
									catalog: total().catalog,
							  }
				}}
				<span class="share">{{ total().share }}%</span>
			</p>

			<ul class="plot">
				@for (column of columns(); track column.label) {
					<li
						class="slot"
						tabindex="0"
						[attr.aria-label]="
							column.label +
							': ' +
							column.catalog +
							' albums in the catalog, ' +
							column.collected +
							' collected'
						"
					>
						<span class="bar-area" aria-hidden="true">
							<span
								class="stack"
								[style.height.%]="column.height"
							>
								@if (column.rest) {
									<span
										class="segment is-catalog"
										[style.flex-grow]="column.rest"
									></span>
								}
								@if (column.collected) {
									<span
										class="segment is-collected"
										[style.flex-grow]="column.collected"
									></span>
								}
							</span>
						</span>
						<span class="tick" aria-hidden="true">{{
							column.shortLabel
						}}</span>
						<span class="tooltip" aria-hidden="true">
							<span class="tooltip-title">{{
								column.label
							}}</span>
							<span
								><strong>{{ column.catalog }}</strong>
								{{
									'ui.catalogCoverageChart.in-the-catalog'
										| transloco
								}}</span
							>
							<span
								><strong>{{ column.collected }}</strong>
								collected ({{ column.share }}%)</span
							>
						</span>
					</li>
				}
			</ul>
		</figure>
	`,
	styles: `
		:host {
			display: block;

			/* Rest of the catalog: a light step of the chart hue. */
			--coverage-rest: color-mix(
				in srgb,
				var(--mc-chart) 28%,
				var(--mc-card-bg)
			);
		}

		.chart {
			margin: 0;
		}

		.head {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.5rem 1.5rem;
		}

		.title {
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.legend {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem 1rem;
			margin: 0;
			padding: 0;
			list-style: none;
			font-size: 0.8rem;
			color: var(--mc-text-muted);

			li {
				display: inline-flex;
				align-items: center;
				gap: 0.4rem;
			}
		}

		.swatch {
			width: 10px;
			height: 10px;
			border-radius: 3px;

			&.is-collected {
				background: var(--mc-chart);
			}

			&.is-catalog {
				background: var(--coverage-rest);
			}
		}

		.summary {
			margin: 0.6rem 0 1.25rem;
			font-size: 0.9rem;
			color: var(--mc-text-muted);

			strong {
				font-size: 1.6rem;
				font-weight: 700;
				color: var(--mc-text);
				font-variant-numeric: tabular-nums;
			}
		}

		.share {
			margin-left: 0.35rem;
			padding: 0.1rem 0.45rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-text);
			background: var(--mc-surface-2);
			border-radius: 999px;
		}

		.plot {
			display: flex;
			align-items: stretch;
			gap: 2px;
			height: 200px;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.slot {
			position: relative;
			display: flex;
			flex: 1;
			flex-direction: column;
			align-items: center;
			min-width: 0;
			border-radius: var(--mc-radius-sm);
		}

		.slot:focus-visible {
			outline: 2px solid var(--mc-text);
			outline-offset: 2px;
		}

		.bar-area {
			display: flex;
			flex: 1;
			align-items: flex-end;
			justify-content: center;
			width: 100%;
			/* Hairline baseline */
			border-bottom: 1px solid var(--mc-border-strong);
		}

		.stack {
			display: flex;
			flex-direction: column;
			/* 2px surface gap between the two segments. */
			gap: 2px;
			width: min(32px, 70%);
			min-height: 2px;
			overflow: hidden;
			border-radius: 4px 4px 0 0;
			transition: filter var(--mc-duration-fast) ease;
		}

		.segment {
			flex-basis: 0;
			min-height: 2px;

			&.is-collected {
				background: var(--mc-chart);
			}

			&.is-catalog {
				background: var(--coverage-rest);
			}
		}

		.slot:hover .stack,
		.slot:focus-visible .stack {
			filter: brightness(1.2);
		}

		.tick {
			margin-top: 0.4rem;
			font-size: 0.7rem;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.tooltip {
			position: absolute;
			bottom: calc(100% - 0.5rem);
			left: 50%;
			z-index: 5;
			display: flex;
			flex-direction: column;
			gap: 0.1rem;
			padding: 0.4rem 0.65rem;
			font-size: 0.75rem;
			white-space: nowrap;
			color: var(--mc-text-muted);
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-sm);
			box-shadow: var(--mc-shadow-menu);
			opacity: 0;
			transform: translateX(-50%);
			transition: opacity var(--mc-duration-fast) ease;
			pointer-events: none;

			strong {
				color: var(--mc-text);
				font-variant-numeric: tabular-nums;
			}
		}

		.tooltip-title {
			font-weight: 700;
			color: var(--mc-text);
		}

		.slot:hover .tooltip,
		.slot:focus-visible .tooltip {
			opacity: 1;
		}

		@media (prefers-reduced-motion: reduce) {
			.stack,
			.tooltip {
				transition: none;
			}
		}
	`,
})
export class CatalogCoverageChartComponent {
	public readonly heading = input.required<string>();
	public readonly data = input.required<DecadeCoverage[]>();

	protected readonly total = computed(() => {
		const catalog = this.data().reduce((sum, d) => sum + d.catalog, 0);
		const collected = this.data().reduce((sum, d) => sum + d.collected, 0);

		return { catalog, collected, share: percent(collected, catalog) };
	});

	protected readonly columns = computed(() => {
		const data = this.data();
		const max = Math.max(1, ...data.map((datum) => datum.catalog));

		return data.map((datum) => ({
			...datum,
			rest: datum.catalog - datum.collected,
			/** "1980s" → "’80s" keeps the ticks short. */
			shortLabel: `’${datum.label.slice(2)}`,
			height: (datum.catalog / max) * 100,
			share: percent(datum.collected, datum.catalog),
		}));
	});
}

function percent(part: number, whole: number): number {
	return whole ? Math.round((part / whole) * 100) : 0;
}
