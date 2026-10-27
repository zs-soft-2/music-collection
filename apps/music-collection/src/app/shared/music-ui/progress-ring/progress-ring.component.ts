import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * One ratio against its limit, drawn as a ring with the share in the middle.
 *
 * A meter, not a two-slice pie: the track and the fill are the same hue, so
 * the ring reads as "this far along" rather than as two competing classes.
 * The number in the middle is the answer; the ring is only how far along it
 * looks.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-progress-ring',
	imports: [...I18N_IMPORTS],
	template: `
		<div
			class="ring"
			role="meter"
			[attr.aria-valuenow]="percent()"
			aria-valuemin="0"
			aria-valuemax="100"
			[attr.aria-label]="label()"
		>
			<svg viewBox="0 0 100 100" aria-hidden="true">
				<circle class="track" cx="50" cy="50" [attr.r]="radius" />
				<circle
					class="fill"
					cx="50"
					cy="50"
					[attr.r]="radius"
					[attr.stroke-dasharray]="dash()"
				/>
			</svg>

			<div class="middle" aria-hidden="true">
				<b class="value">{{ percent() | mcNumber }}%</b>
				<span class="caption">{{ caption() }}</span>
			</div>
		</div>
	`,
	styles: `
		:host {
			display: block;
		}

		.ring {
			position: relative;
			width: 8.5rem;
			height: 8.5rem;
		}

		svg {
			width: 100%;
			height: 100%;
			transform: rotate(-90deg);
		}

		circle {
			fill: none;
			stroke-width: 9;
		}

		.track {
			stroke: var(--mc-border);
		}

		.fill {
			stroke: var(--mc-primary);
			stroke-linecap: round;
			transition: stroke-dasharray var(--mc-duration) ease;
		}

		.middle {
			position: absolute;
			inset: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.1rem;
		}

		.value {
			font-family: var(--mc-font-display);
			font-size: 2rem;
			line-height: 1;
			color: var(--mc-text);
		}

		.caption {
			font-size: 0.65rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}
	`,
})
export class ProgressRingComponent {
	public readonly value = input.required<number>();
	public readonly max = input.required<number>();
	/** Under the number; what the share is a share of. */
	public readonly caption = input('');
	/** The whole meter in words, for a reader who cannot see it. */
	public readonly label = input.required<string>();

	protected readonly radius = RADIUS;

	protected readonly percent = computed(() => {
		const max = this.max();

		return max > 0 ? Math.round((this.value() / max) * 100) : 0;
	});

	protected readonly dash = computed(() => {
		const drawn = (this.percent() / 100) * CIRCUMFERENCE;

		return `${drawn} ${CIRCUMFERENCE - drawn}`;
	});
}
