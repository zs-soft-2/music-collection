import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The pin a collection pays, in the ring of how far this shelf gets.
 *
 * It is what a collector is actually playing for, so it stands in the
 * corner of the card on its own — not over the covers, which are somebody
 * else's artwork and the reason the mosaic is there at all. The ring around
 * it says how close the pin is, which is the one number that belongs beside
 * a reward rather than beside the records.
 *
 * The host carries the size; everything inside is relative to it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-pin',
	template: `
		@if (ring()) {
			<svg viewBox="0 0 100 100" aria-hidden="true">
				<circle class="track" cx="50" cy="50" [attr.r]="radius" />
				@if (percentage() > 0) {
					<circle
						class="fill"
						cx="50"
						cy="50"
						[attr.r]="radius"
						[attr.stroke-dasharray]="dash()"
					/>
				}
			</svg>
		}

		<span class="badge">
			@if (badgeArtworkUrl(); as artwork) {
				<img [src]="artwork" [alt]="badgeName() ?? ''" loading="lazy" />
			} @else {
				<i
					class="pi {{ icon() || 'pi-bookmark' }}"
					aria-hidden="true"
				></i>
			}
		</span>
	`,
	host: { '[class.is-completed]': 'completed()' },
	styles: `
		/*
		 * Minden benne abszolút: a jelvény képe különben a saját méretét
		 * hozná (a százalékos magasság nem oldódik fel automatikus magasság
		 * ellenében), és flex-elemként szétfeszítené a kört.
		 */
		:host {
			position: relative;
			display: block;
			flex: none;
			min-height: 0;
			aspect-ratio: 1;
		}

		svg {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			transform: rotate(-90deg);
		}

		circle {
			fill: none;
			stroke-width: 9;
		}

		.track {
			stroke: var(--mc-pin-track, rgba(255, 255, 255, 0.16));
		}

		.fill {
			stroke: var(--mc-primary);
			stroke-linecap: round;
			transition: stroke-dasharray var(--mc-duration) ease;

			:host(.is-completed) & {
				stroke: var(--mc-accent);
			}
		}

		/*
		 * .badge, nem .pin: a hostra a befoglaló kártya tesz pin
		 * osztályt, és két azonos nevű szabály közül nehéz megmondani,
		 * melyik melyikre vonatkozik.
		 */
		.badge {
			position: absolute;
			inset: 13%;
			display: grid;
			place-items: center;
			overflow: hidden;
			font-size: var(--mc-pin-size, 1.1rem);
			color: var(--mc-accent);
			background: var(--mc-pin-bg, rgba(10, 10, 10, 0.55));
			border-radius: 50%;

			img {
				width: 100%;
				height: 100%;
				object-fit: contain;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.fill {
				transition: none;
			}
		}
	`,
})
export class CollectionPinComponent {
	public readonly badgeArtworkUrl = input<string | null>(null);
	public readonly badgeName = input<string | null>(null);
	/** PrimeIcons class, for a collection with no pin cast yet. */
	public readonly icon = input<string | null>(null);
	/** 0–100; what the ring draws. */
	public readonly percentage = input(0);
	public readonly completed = input(false);
	/** The ring; off where the progress is said right beside it. */
	public readonly ring = input(true);

	protected readonly radius = RADIUS;

	/**
	 * How much of the ring is drawn. An empty shelf draws none of it: the
	 * round cap would otherwise leave a dot on the ring, which reads as a
	 * record owned rather than as a collection not started.
	 */
	protected readonly dash = computed(() => {
		const drawn = (this.percentage() / 100) * CIRCUMFERENCE;

		return drawn > 0
			? `${drawn} ${CIRCUMFERENCE - drawn}`
			: `0 ${CIRCUMFERENCE}`;
	});
}
