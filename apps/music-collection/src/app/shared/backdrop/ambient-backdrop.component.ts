import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Globális, nagyon halvány háttér: két sarki radiális derengés az
 * akcentszínekből és finom grain, hogy az üres felületek ne legyenek
 * egyhangúak. Fix réteg, nem fogad eseményt.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-ambient-backdrop',
	template:
		'<div class="glow"></div><div class="plate"></div><div class="brushed"></div><div class="grain"></div>',
	host: { 'aria-hidden': 'true' },
	styles: `
		:host {
			position: fixed;
			inset: 0;
			z-index: 0;
			pointer-events: none;
			overflow: hidden;
			--mc-ambient-strength: 0.07;
		}

		:host-context(html.mc-light) {
			--mc-ambient-strength: 0.05;
		}

		.glow {
			position: absolute;
			inset: 0;
			background:
				radial-gradient(
					60vmax 45vmax at 0% 0%,
					color-mix(
						in srgb,
						var(--mc-primary) calc(var(--mc-ambient-strength) * 100%),
						transparent
					),
					transparent 70%
				),
				radial-gradient(
					55vmax 40vmax at 100% 100%,
					color-mix(
						in srgb,
						var(--mc-accent) calc(var(--mc-ambient-strength) * 70%),
						transparent
					),
					transparent 70%
				);
		}

		// A minták középen elhalványulnak, a széleken erősebbek.
		.plate,
		.brushed {
			position: absolute;
			inset: 0;
			background: var(--mc-text);
			mask-composite: intersect;
			-webkit-mask-composite: source-in;
		}

		// Diamond plate (recés acéllemez) motívum.
		.plate {
			opacity: 0.045;
			mask-image:
				url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cg fill='%23000'%3E%3Crect x='3' y='7.5' width='12' height='3' rx='1.5' transform='rotate(45 9 9)'/%3E%3Crect x='21' y='25.5' width='12' height='3' rx='1.5' transform='rotate(45 27 27)'/%3E%3Crect x='21' y='7.5' width='12' height='3' rx='1.5' transform='rotate(-45 27 9)'/%3E%3Crect x='3' y='25.5' width='12' height='3' rx='1.5' transform='rotate(-45 9 27)'/%3E%3C/g%3E%3C/svg%3E"),
				radial-gradient(
					ellipse 70% 80% at 50% 45%,
					transparent 35%,
					#000 100%
				);
			mask-size: 36px 36px, 100% 100%;
			mask-repeat: repeat, no-repeat;
		}

		// Szálcsiszolt fém karcai.
		.brushed {
			opacity: 0.06;
			mask-image:
				url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Cfilter id='b'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.004 0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.4 -0.5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23b)'/%3E%3C/svg%3E"),
				radial-gradient(
					ellipse 70% 80% at 50% 45%,
					transparent 25%,
					#000 100%
				);
			mask-size: 400px 200px, 100% 100%;
			mask-repeat: repeat, no-repeat;
		}

		.grain {
			position: absolute;
			inset: 0;
			opacity: 0.035;
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		}
	`,
})
export class AmbientBackdropComponent {}
