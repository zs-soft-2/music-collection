import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CountDatum } from '../count-stats';
import { DONUT_RADIUS, toDonutSlices } from './donut-slices';

/**
 * Part-to-whole ring with the headline number in its middle.
 *
 * The ring is the picture; the legend beside it is the data. Every class
 * carries its own count and share in text, which is what makes the ring
 * honest: nobody has to judge an angle, and the one adjacent pair of hues
 * that sits in the colour-blind warn band is told apart by its label rather
 * than by its colour. That is also why there is no number on the arcs —
 * they would only repeat the legend over a curve.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-donut-chart',
	imports: [...I18N_IMPORTS],
	template: `
		<figure class="chart">
			<figcaption class="title">{{ heading() }}</figcaption>

			@if (slices().length) {
				<div class="body">
					<div
						class="ring-area"
						role="img"
						[attr.aria-label]="summary()"
					>
						<svg viewBox="0 0 100 100" aria-hidden="true">
							<circle
								class="track"
								cx="50"
								cy="50"
								[attr.r]="radius"
							/>
							@for (slice of slices(); track slice.label) {
								<circle
									class="arc"
									cx="50"
									cy="50"
									[attr.r]="radius"
									[style.stroke]="slice.color"
									[attr.stroke-dasharray]="slice.dash"
									[attr.stroke-dashoffset]="slice.offset"
									[class.is-dimmed]="dimmed(slice.label)"
									[class.is-active]="
										active() === slice.label
									"
								/>
							}
						</svg>

						<div class="middle" aria-hidden="true">
							<b class="total">{{ total() | mcNumber }}</b>
							@if (totalLabel()) {
								<span class="total-label">{{
									totalLabel()
								}}</span>
							}
						</div>
					</div>

					<!--
						The legend is the table view as well: it is how a
						reader gets the exact numbers, and how anyone who
						cannot separate two neighbouring hues still can.
					-->
					<ul class="legend">
						@for (slice of slices(); track slice.label) {
							<li
								class="entry"
								tabindex="0"
								[class.is-dimmed]="dimmed(slice.label)"
								(mouseenter)="active.set(slice.label)"
								(mouseleave)="active.set(null)"
								(focus)="active.set(slice.label)"
								(blur)="active.set(null)"
							>
								<span
									class="dot"
									[style.background]="slice.color"
									aria-hidden="true"
								></span>
								<span class="label">{{ slice.label }}</span>
								<span class="count">{{
									slice.count | mcNumber
								}}</span>
								<span class="share"
									>{{ slice.share | mcNumber }}%</span
								>
							</li>
						}
					</ul>
				</div>
			} @else {
				<p class="empty">{{ emptyText() }}</p>
			}
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

		.body {
			display: flex;
			align-items: center;
			gap: 1.5rem;
		}

		.ring-area {
			position: relative;
			flex: 0 0 auto;
			width: 10.5rem;
			height: 10.5rem;
		}

		svg {
			width: 100%;
			height: 100%;
			/* Twelve o'clock, the way a reader starts a pie. */
			transform: rotate(-90deg);
		}

		circle {
			fill: none;
			stroke-width: 11;
		}

		.track {
			stroke: var(--mc-border);
		}

		.arc {
			transition:
				stroke-width var(--mc-duration-fast) ease,
				opacity var(--mc-duration-fast) ease;
		}

		.arc.is-active {
			stroke-width: 14;
		}

		.is-dimmed {
			opacity: 0.35;
		}

		.middle {
			position: absolute;
			inset: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.15rem;
		}

		.total {
			font-family: var(--mc-font-display);
			font-size: 2.5rem;
			line-height: 1;
			letter-spacing: 0.02em;
			color: var(--mc-text);
		}

		.total-label {
			font-size: 0.7rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.legend {
			display: flex;
			flex: 1 1 auto;
			flex-direction: column;
			gap: 0.4rem;
			min-width: 0;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.entry {
			display: grid;
			grid-template-columns: auto 1fr auto auto;
			align-items: center;
			gap: 0.6rem;
			padding: 0.2rem 0.35rem;
			border-radius: var(--mc-radius-sm);
			font-size: 0.85rem;
			transition:
				background var(--mc-duration-fast) ease,
				opacity var(--mc-duration-fast) ease;
		}

		.entry:hover,
		.entry:focus-visible {
			background: var(--mc-surface-2);
			outline: none;
		}

		.entry:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 1px;
		}

		.dot {
			width: 0.65rem;
			height: 0.65rem;
			border-radius: 50%;
		}

		.label {
			overflow: hidden;
			color: var(--mc-text);
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.count {
			font-variant-numeric: tabular-nums;
			color: var(--mc-text);
		}

		.share {
			min-width: 2.75rem;
			font-variant-numeric: tabular-nums;
			text-align: right;
			color: var(--mc-text-subtle);
		}

		.empty {
			margin: 0;
			color: var(--mc-text-subtle);
		}

		@media (max-width: 720px) {
			.body {
				flex-direction: column;
				align-items: stretch;
				gap: 1.25rem;
			}

			.ring-area {
				align-self: center;
			}
		}
	`,
})
export class DonutChartComponent {
	public readonly heading = input.required<string>();
	public readonly data = input.required<CountDatum[]>();
	/** What the summed tail is called; also the seventh class and beyond. */
	public readonly otherLabel = input('…');
	/** Under the number in the middle, e.g. "lemez". */
	public readonly totalLabel = input('');
	/**
	 * The number the ring frames, where it is not the sum of the slices — a
	 * record with two styles is counted twice on the ring, but the collection
	 * it belongs to has only one of it.
	 */
	public readonly centerValue = input<number | null>(null);
	/** Said when there is nothing to draw. */
	public readonly emptyText = input('');

	protected readonly radius = DONUT_RADIUS;
	/** The class the pointer or the keyboard is on; the rest step back. */
	protected readonly active = signal<string | null>(null);

	protected readonly slices = computed(() =>
		toDonutSlices(this.data(), this.otherLabel())
	);

	protected readonly total = computed(
		() =>
			this.centerValue() ??
			this.slices().reduce((sum, slice) => sum + slice.count, 0)
	);

	/** The whole ring in one sentence, for a reader who cannot see it. */
	protected readonly summary = computed(() =>
		[
			this.heading(),
			...this.slices().map(
				(slice) => `${slice.label}: ${slice.count} (${slice.share}%)`
			),
		].join('. ')
	);

	protected dimmed(label: string): boolean {
		const active = this.active();

		return active !== null && active !== label;
	}
}
