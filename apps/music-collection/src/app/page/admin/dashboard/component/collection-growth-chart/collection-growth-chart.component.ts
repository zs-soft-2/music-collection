import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { GrowthPoint } from '../../admin-dashboard.mapper';

/** Ennyi tengelyfelirat fér ki torlódás nélkül. */
const MAX_TICKS = 6;

/**
 * A gyűjtemény gyarapodása: a kiadások futó összege terület-diagramon. Egy
 * sorozat, ezért nincs jelmagyarázat; az aktuális összeg a fejlécben áll, a
 * periódusonkénti értékek hoverre, fókuszra és képernyőolvasónak érhetők el.
 * Az SVG a vonalat rajzolja, a HTML-rétegek a hover-sávokat és a tooltipet.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-growth-chart',
	imports: [...I18N_IMPORTS],
	template: `
		<figure class="chart">
			<figcaption class="head">
				<span class="title">{{ heading() }}</span>
				<span class="summary">
					<strong>{{ latest().total }}</strong> releases
					@if (latest().added) {
						<span class="delta"
							>+{{ latest().added }} in {{ latest().label }}</span
						>
					}
				</span>
			</figcaption>

			<div class="plot">
				<svg
					class="lines"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path class="area" [attr.d]="paths().area" />
					<path class="line" [attr.d]="paths().line" />
				</svg>

				<ul class="slots">
					@for (point of points(); track point.label) {
						<li
							class="slot"
							tabindex="0"
							[attr.aria-label]="
								point.label +
								': ' +
								point.added +
								' added, ' +
								point.total +
								' in total'
							"
						>
							<span class="crosshair" aria-hidden="true"></span>
							<span
								class="dot"
								aria-hidden="true"
								[style.bottom.%]="point.y"
							></span>
							<span
								class="tooltip"
								aria-hidden="true"
								[class.is-start]="point.isStart"
								[class.is-end]="point.isEnd"
							>
								<span class="tooltip-title">{{
									point.label
								}}</span>
								<span
									><strong>+{{ point.added }}</strong>
									{{
										'ui.collectionGrowthChart.added'
											| transloco
									}}</span
								>
								<span
									><strong>{{ point.total }}</strong>
									{{
										'ui.collectionGrowthChart.in-total'
											| transloco
									}}</span
								>
							</span>
						</li>
					}
				</ul>
			</div>

			<ul class="ticks" aria-hidden="true">
				@for (point of points(); track point.label) {
					<li>
						@if (point.hasTick) {
							<span>{{ point.label }}</span>
						}
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

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.head {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.5rem 1.5rem;
			margin-bottom: 1rem;
		}

		.title {
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.summary {
			font-size: 0.85rem;
			color: var(--mc-text-muted);

			strong {
				font-size: 1.6rem;
				font-weight: 700;
				color: var(--mc-text);
				font-variant-numeric: tabular-nums;
			}
		}

		.delta {
			margin-left: 0.5rem;
			padding: 0.1rem 0.45rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-text);
			background: var(--mc-surface-2);
			border-radius: 999px;
		}

		.plot {
			position: relative;
			height: 200px;
			/* Room for the line stroke at the top. */
			padding-top: 4px;
			border-bottom: 1px solid var(--mc-border-strong);
		}

		.lines {
			position: absolute;
			inset: 4px 0 0;
			width: 100%;
			height: calc(100% - 4px);
			overflow: visible;
		}

		.area {
			fill: color-mix(in srgb, var(--mc-chart) 18%, transparent);
		}

		.line {
			fill: none;
			stroke: var(--mc-chart);
			stroke-width: 2px;
			stroke-linejoin: round;
			vector-effect: non-scaling-stroke;
		}

		.slots {
			position: absolute;
			inset: 4px 0 0;
			display: flex;
		}

		.slot {
			position: relative;
			flex: 1;
			min-width: 0;
		}

		.slot:focus-visible {
			outline: 2px solid var(--mc-text);
			outline-offset: -2px;
			border-radius: var(--mc-radius-sm);
		}

		.crosshair {
			position: absolute;
			inset: 0 auto 0 50%;
			width: 1px;
			background: var(--mc-border-strong);
			opacity: 0;
		}

		.dot {
			position: absolute;
			left: 50%;
			width: 8px;
			height: 8px;
			background: var(--mc-chart);
			/* 2px surface ring, so the dot stays legible on the line. */
			box-shadow: 0 0 0 2px var(--mc-card-bg);
			border-radius: 50%;
			opacity: 0;
			transform: translate(-50%, 50%);
		}

		.tooltip {
			position: absolute;
			top: 0;
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
			transform: translate(-50%, -100%);
			pointer-events: none;

			&.is-start {
				transform: translate(-1rem, -100%);
			}

			&.is-end {
				transform: translate(calc(-100% + 1rem), -100%);
			}

			strong {
				color: var(--mc-text);
				font-variant-numeric: tabular-nums;
			}
		}

		.tooltip-title {
			font-weight: 700;
			color: var(--mc-text);
		}

		.slot:hover,
		.slot:focus-visible {
			.crosshair,
			.dot,
			.tooltip {
				opacity: 1;
			}
		}

		.ticks {
			display: flex;
			margin-top: 0.4rem;

			li {
				position: relative;
				flex: 1;
				min-width: 0;
				height: 1rem;
			}

			span {
				position: absolute;
				left: 50%;
				font-size: 0.7rem;
				white-space: nowrap;
				color: var(--mc-text-subtle);
				font-variant-numeric: tabular-nums;
				transform: translateX(-50%);
			}

			li:first-child span {
				left: 0;
				transform: none;
			}

			li:last-child span {
				right: 0;
				left: auto;
				transform: none;
			}
		}
	`,
})
export class CollectionGrowthChartComponent {
	public readonly heading = input.required<string>();
	public readonly data = input.required<GrowthPoint[]>();

	protected readonly latest = computed(
		() =>
			this.data()[this.data().length - 1] ?? {
				label: '',
				added: 0,
				total: 0,
			}
	);

	protected readonly points = computed(() => {
		const data = this.data();
		const max = Math.max(1, ...data.map((point) => point.total));
		const step = Math.ceil(data.length / MAX_TICKS);
		const last = data.length - 1;

		return data.map((point, i) => ({
			...point,
			/* Slot centres, so the line runs through the hover targets. */
			x: ((i + 0.5) / data.length) * 100,
			y: (point.total / max) * 100,
			/* The last tick always shows; drop the one before if too close. */
			hasTick: i === last || (i % step === 0 && last - i >= step),
			isStart: i < data.length / 6,
			isEnd: i > (data.length * 5) / 6,
		}));
	});

	protected readonly paths = computed(() => {
		const points = this.points();

		if (!points.length) {
			return { line: '', area: '' };
		}

		const coords = points.map(
			(point) => `${point.x.toFixed(2)} ${(100 - point.y).toFixed(2)}`
		);
		const line = `M ${coords.join(' L ')}`;
		const first = points[0].x.toFixed(2);
		const last = points[points.length - 1].x.toFixed(2);

		return { line, area: `${line} L ${last} 100 L ${first} 100 Z` };
	});
}
