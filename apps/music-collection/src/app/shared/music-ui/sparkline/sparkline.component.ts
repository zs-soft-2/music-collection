import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CountDatum } from '../count-stats';

/** The drawing box; the line is plotted in these units and scaled by CSS. */
const WIDTH = 100;
const HEIGHT = 32;
/** Room for the stroke and the marker, so neither is clipped at the edges. */
const PAD = 3;

interface Point extends CountDatum {
	x: number;
	y: number;
	/** Left edge of this point's share of the hover strip. */
	hitX: number;
	hitWidth: number;
}

/**
 * A trend at a glance, next to the number it belongs to.
 *
 * No axes and no grid: a sparkline answers "which way, and how steadily",
 * and the exact values belong to the hover and to the figure's own caption.
 * The last point is marked, because "where it stands now" is the one value
 * the shape alone cannot say.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-sparkline',
	imports: [...I18N_IMPORTS],
	template: `
		<figure class="spark">
			<svg
				[attr.viewBox]="'0 0 ' + width + ' ' + height"
				preserveAspectRatio="none"
				role="img"
				[attr.aria-label]="summary()"
			>
				@if (points().length > 1) {
					<path class="area" [attr.d]="area()" />
					<path class="line" [attr.d]="line()" />
				}

				@for (point of points(); track point.label) {
					<rect
						class="hit"
						[attr.x]="point.hitX"
						y="0"
						[attr.width]="point.hitWidth"
						[attr.height]="height"
						(mouseenter)="active.set(point)"
						(mouseleave)="active.set(null)"
					/>
				}

				@if (marker(); as point) {
					<circle
						class="marker"
						[attr.cx]="point.x"
						[attr.cy]="point.y"
						r="2.4"
					/>
				}
			</svg>

			@if (active(); as point) {
				<figcaption class="readout" aria-hidden="true">
					<b>{{ point.count | mcNumber }}</b>
					<span>{{ point.label }}</span>
				</figcaption>
			}
		</figure>
	`,
	styles: `
		:host {
			display: block;
		}

		.spark {
			position: relative;
			margin: 0;
		}

		svg {
			display: block;
			width: 100%;
			height: 2.75rem;
			overflow: visible;
		}

		.line {
			fill: none;
			stroke: var(--mc-primary);
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			/* The box is squashed by CSS; the stroke must not be. */
			vector-effect: non-scaling-stroke;
		}

		.area {
			fill: color-mix(in srgb, var(--mc-primary) 16%, transparent);
			stroke: none;
		}

		.marker {
			fill: var(--mc-primary);
			stroke: var(--mc-card-bg);
			stroke-width: 1;
			vector-effect: non-scaling-stroke;
		}

		.hit {
			fill: transparent;
		}

		.readout {
			position: absolute;
			top: -0.35rem;
			right: 0;
			display: flex;
			gap: 0.35rem;
			align-items: baseline;
			padding: 0.1rem 0.4rem;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-sm);
			background: var(--mc-surface-2);
			font-size: 0.7rem;
			white-space: nowrap;
			pointer-events: none;
		}

		.readout span {
			color: var(--mc-text-subtle);
		}
	`,
})
export class SparklineComponent {
	public readonly data = input.required<CountDatum[]>();
	/** What the series is, for a reader who cannot see the line. */
	public readonly label = input('');

	protected readonly width = WIDTH;
	protected readonly height = HEIGHT;
	protected readonly active = signal<Point | null>(null);

	protected readonly points = computed<Point[]>(() => {
		const data = this.data();

		if (!data.length) {
			return [];
		}

		const peak = Math.max(...data.map((datum) => datum.count), 1);
		const span = data.length > 1 ? WIDTH - PAD * 2 : 0;
		const step = data.length > 1 ? span / (data.length - 1) : 0;
		const hitWidth = WIDTH / data.length;

		return data.map((datum, index) => ({
			...datum,
			x: data.length > 1 ? PAD + index * step : WIDTH / 2,
			y:
				HEIGHT -
				PAD -
				(datum.count / peak) * (HEIGHT - PAD * 2),
			hitX: index * hitWidth,
			hitWidth,
		}));
	});

	protected readonly line = computed(() =>
		this.points()
			.map(
				(point, index) =>
					`${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
			)
			.join(' ')
	);

	protected readonly area = computed(() => {
		const points = this.points();

		if (points.length < 2) {
			return '';
		}

		const first = points[0];
		const last = points[points.length - 1];

		return `${this.line()} L${last.x.toFixed(2)} ${HEIGHT} L${first.x.toFixed(2)} ${HEIGHT} Z`;
	});

	protected readonly marker = computed(() => {
		const points = this.points();

		return points.length ? points[points.length - 1] : null;
	});

	protected readonly summary = computed(() =>
		[
			this.label(),
			...this.points().map((point) => `${point.label}: ${point.count}`),
		]
			.filter(Boolean)
			.join('. ')
	);
}
