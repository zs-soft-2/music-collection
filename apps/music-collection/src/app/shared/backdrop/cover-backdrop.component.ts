import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * Tartalomhoz igazodó háttér: a borítókép erősen elmosva, halványan a lap
 * tetején, lefelé a háttérszínbe úsztatva. Részletoldalakra (pl. track).
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-cover-backdrop',
	imports: [...I18N_IMPORTS],
	template: `
		@if (src()) {
			<img [src]="src()" alt="" />
		}
	`,
	host: { 'aria-hidden': 'true' },
	styles: `
		:host {
			position: fixed;
			inset: var(--mc-app-bar-height) 0 0 0;
			z-index: -1;
			pointer-events: none;
			overflow: hidden;
			mask-image: linear-gradient(
				to bottom,
				#000 0%,
				transparent max(70vh, 640px)
			);
		}

		img {
			position: absolute;
			top: -80px;
			left: -10%;
			width: 120%;
			height: max(70vh, 640px);
			object-fit: cover;
			filter: blur(80px) saturate(1.5);
			opacity: 0.35;
			transform: translateZ(0);
		}

		:host-context(html.mc-light) img {
			opacity: 0.25;
		}
	`,
})
export class CoverBackdropComponent {
	public readonly src = input<string | null | undefined>();
}
