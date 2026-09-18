import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import { CountDatum } from '../count-stats';

/**
 * Single-series column chart of releases per decade. The title names the
 * series, so there is no legend; the peak is labelled on its cap and every
 * value is available on hover, on keyboard focus and to screen readers.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-decade-chart',
	template: `
		<figure class="chart">
			<figcaption class="title">{{ title() }}</figcaption>

			<ul class="plot">
				@for (column of columns(); track column.label) {
					<li
						class="slot"
						tabindex="0"
						[attr.aria-label]="
							column.label + ': ' + column.count + ' releases'
						"
					>
						<span class="bar-area" aria-hidden="true">
							<span class="bar" [style.height.%]="column.height">
								@if (column.isPeak) {
									<span class="cap-label">{{
										column.count
									}}</span>
								}
							</span>
						</span>
						<span class="tick" aria-hidden="true">{{
							column.shortLabel
						}}</span>
						<span class="tooltip" aria-hidden="true">
							<strong>{{ column.count }}</strong>
							<span>{{ column.label }}</span>
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

		.plot {
			display: flex;
			align-items: stretch;
			gap: 2px;
			height: 190px;
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
			position: relative;
			display: flex;
			flex: 1;
			align-items: flex-end;
			justify-content: center;
			width: 100%;
			padding-top: 1.4rem;
			/* Hairline baseline */
			border-bottom: 1px solid var(--mc-border-strong);
		}

		.bar {
			position: relative;
			width: min(24px, 70%);
			min-height: 2px;
			background: var(--mc-chart);
			border-radius: 4px 4px 0 0;
			transition: filter var(--mc-duration-fast) ease;
		}

		.slot:hover .bar,
		.slot:focus-visible .bar {
			filter: brightness(1.2);
		}

		.cap-label {
			position: absolute;
			bottom: 100%;
			left: 50%;
			margin-bottom: 0.3rem;
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--mc-text);
			transform: translateX(-50%);
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
			align-items: center;
			padding: 0.35rem 0.6rem;
			white-space: nowrap;
			background: #000;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-sm);
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
			opacity: 0;
			transform: translateX(-50%);
			transition: opacity var(--mc-duration-fast) ease;
			pointer-events: none;

			strong {
				font-size: 0.95rem;
				color: var(--mc-text);
			}

			span {
				font-size: 0.7rem;
				color: var(--mc-text-muted);
			}
		}

		.slot:hover .tooltip,
		.slot:focus-visible .tooltip {
			opacity: 1;
		}
	`,
})
export class DecadeChartComponent {
	public readonly title = input.required<string>();
	public readonly data = input.required<CountDatum[]>();

	protected readonly columns = computed(() => {
		const data = this.data();
		const max = Math.max(1, ...data.map((datum) => datum.count));

		return data.map((datum) => ({
			...datum,
			/** "1980s" → "’80s" keeps the ticks short. */
			shortLabel: `’${datum.label.slice(2)}`,
			height: (datum.count / max) * 100,
			isPeak: datum.count === max,
		}));
	});
}
