import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { ZoomTransform, zoom, zoomIdentity } from 'd3-zoom';

import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	afterNextRender,
	computed,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { FeatureCollection } from 'geojson';

/** One place on the map, and how many collectors it stands for. */
export interface WorldMapPin {
	id: string;
	/** [longitude, latitude], the order d3 projections take. */
	position: [number, number];
	label: string;
	count: number;
}

/** The drawing is made at this size and scaled by the viewBox. */
const WIDTH = 960;
const HEIGHT = 500;

/**
 * A pin of one collector, and of the largest crowd. Small on purpose: at
 * world zoom two neighbouring countries are a few pixels apart, so a pin
 * that reads well on its own would swallow the ones next to it. Zooming in
 * is what pulls them apart — the pins keep their size while the countries
 * grow under them.
 */
const MIN_RADIUS = 3.5;
const MAX_RADIUS = 11;

/** Below this a number would not fit inside the dot, so it is left off. */
const COUNT_RADIUS = 7;

/** What can be hit with a finger, however small the pin itself is. */
const HIT_RADIUS = 9;

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-world-map',
	imports: [...I18N_IMPORTS],
	template: `
		<svg
			#canvas
			[attr.viewBox]="'0 0 ' + width + ' ' + height"
			role="img"
			[attr.aria-label]="label()"
		>
			<g [attr.transform]="transform().toString()">
				<path class="land" [attr.d]="landPath()" />

				@for (pin of placed(); track pin.id) {
					<g
						class="pin"
						[class.selected]="pin.id === selectedId()"
						[attr.transform]="
							'translate(' +
							pin.x +
							',' +
							pin.y +
							') scale(' +
							1 / transform().k +
							')'
						"
						tabindex="0"
						role="button"
						[attr.aria-label]="pin.label"
						(click)="pick.emit(pin.id)"
						(keydown.enter)="pick.emit(pin.id)"
						(keydown.space)="pick.emit(pin.id)"
					>
						<circle class="hit" [attr.r]="hitRadius" />
						<circle class="halo" [attr.r]="pin.radius * 2.2" />
						<circle class="dot" [attr.r]="pin.radius" />
						@if (pin.count > 1 && pin.radius >= countRadius) {
							<text dy="0.35em">{{ pin.count }}</text>
						}
					</g>
				}
			</g>
		</svg>
	`,
	styles: `
		:host {
			display: block;
		}

		svg {
			display: block;
			width: 100%;
			height: auto;
			cursor: grab;
			touch-action: none;

			&:active {
				cursor: grabbing;
			}
		}

		.land {
			fill: var(--mc-surface-2);
			stroke: var(--mc-border-strong);
			stroke-width: 0.5;
			vector-effect: non-scaling-stroke;
		}

		.pin {
			cursor: pointer;
			outline: none;

			.hit {
				fill: transparent;
			}

			.halo {
				fill: var(--mc-primary);
				opacity: 0.18;
				pointer-events: none;
			}

			.dot {
				fill: var(--mc-primary);
				pointer-events: none;
			}

			text {
				font-family: var(--mc-font-body);
				font-size: 8px;
				font-weight: 700;
				text-anchor: middle;
				fill: var(--mc-on-primary);
				pointer-events: none;
			}

			// The browser's own focus ring is a box around the group, which
			// on a round pin sits well away from what it marks.
			&:hover .halo,
			&:focus-visible .halo {
				opacity: 0.4;
			}

			&:focus-visible .dot {
				stroke: var(--mc-text);
				stroke-width: 1.5;
			}

			&.selected {
				.halo {
					opacity: 0.45;
				}

				.dot {
					stroke: var(--mc-text);
					stroke-width: 2;
				}
			}
		}
	`,
})
export class WorldMapComponent {
	/** The outline to draw; nothing is drawn until it arrives. */
	public readonly land = input<FeatureCollection | null>(null);
	public readonly pins = input<WorldMapPin[]>([]);
	public readonly selectedId = input<string | null>(null);
	public readonly label = input('World map');

	public readonly pick = output<string>();

	protected readonly width = WIDTH;
	protected readonly height = HEIGHT;
	protected readonly countRadius = COUNT_RADIUS;
	protected readonly hitRadius = HIT_RADIUS;
	protected readonly transform = signal<ZoomTransform>(zoomIdentity);

	private readonly canvas =
		viewChild.required<ElementRef<SVGSVGElement>>('canvas');

	/**
	 * The projection is fitted to the outline once it is known, so the map
	 * fills the drawing whatever the atlas holds.
	 */
	private readonly projection = computed(() => {
		const land = this.land();
		const projection = geoNaturalEarth1();

		return land
			? projection.fitSize([WIDTH, HEIGHT], land)
			: projection.fitSize([WIDTH, HEIGHT], { type: 'Sphere' });
	});

	protected readonly landPath = computed(() => {
		const land = this.land();

		return land ? (geoPath(this.projection())(land) ?? '') : '';
	});

	/** The pins where the projection puts them, sized by their crowd. */
	protected readonly placed = computed(() => {
		const projection = this.projection();
		const pins = this.pins();
		const largest = Math.max(...pins.map((pin) => pin.count), 1);

		return pins.flatMap((pin) => {
			const point = projection(pin.position);

			if (!point) {
				return [];
			}

			const share = largest > 1 ? (pin.count - 1) / (largest - 1) : 0;

			return [
				{
					...pin,
					x: point[0],
					y: point[1],
					radius:
						MIN_RADIUS +
						Math.sqrt(share) * (MAX_RADIUS - MIN_RADIUS),
				},
			];
		});
	});

	public constructor() {
		afterNextRender(() => {
			select(this.canvas().nativeElement).call(
				zoom<SVGSVGElement, unknown>()
					// Far enough in to tell neighbouring countries apart.
					.scaleExtent([1, 16])
					.on('zoom', (event) => this.transform.set(event.transform))
			);
		});
	}
}
