import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	signal,
} from '@angular/core';

import {
	AVATAR_SIZE,
	AVATAR_TATTOO_GLYPHS,
	AVATAR_TATTOO_MARK,
	AvatarEffect,
	AvatarLayerSize,
	AvatarLook,
	AvatarView,
	avatarLayers,
	loadAvatarLayer,
	showsTattoo,
} from '../../data/avatar';

/**
 * The assembled character, drawn as the stack of pictures it is made of.
 *
 * A look is only ever shown once every one of its layers has loaded. The
 * editor changes a garment on every tap, and swapping the `src` of a live
 * image blanks it while the next one arrives — which, on a stack this deep,
 * reads as the character flickering apart and back together. Holding the
 * previous look until the next is ready costs nothing (the layers are cached
 * after their first load) and the change simply happens.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-avatar-figure',
	imports: [...I18N_IMPORTS],
	template: `
		<div class="figure" [class.is-loading]="loading()">
			@for (layer of shown(); track layer) {
				<img [src]="layer" alt="" />
			}

			@if (unavailable()) {
				<p class="unavailable">
					{{ 'ui.avatarFigure.unavailable' | transloco }}
				</p>
			}

			@if (tattoo(); as glyph) {
				<svg [attr.viewBox]="viewBox" aria-hidden="true">
					<text
						[attr.x]="mark.x"
						[attr.y]="mark.y"
						[attr.font-size]="mark.fontSize"
						[attr.fill]="mark.color"
						[attr.fill-opacity]="mark.opacity"
						[attr.transform]="
							'rotate(' + mark.rotation + ' ' + mark.x + ' ' + mark.y + ')'
						"
					>
						{{ glyph }}
					</text>
				</svg>
			}
		</div>
	`,
	styles: `
		:host {
			display: block;
		}

		.figure {
			position: relative;
			aspect-ratio: 2 / 3;
			width: 100%;
			overflow: hidden;
			background: var(--mc-surface-2);
			transition: opacity var(--mc-duration-fast, 150ms);
		}

		// The first load has nothing to hold on to, so the empty stage is
		// dimmed rather than left looking like a character with no clothes.
		.figure.is-loading:empty {
			opacity: 0.4;
		}

		img,
		svg {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
		}

		img {
			object-fit: contain;
		}

		// A garment whose picture never got drawn: the figure keeps the look
		// it had, and this says why nothing happened.
		.unavailable {
			position: absolute;
			inset: auto 0 0;
			padding: 0.5rem 0.75rem;
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text);
			text-align: center;
			background: color-mix(in srgb, var(--mc-surface) 85%, transparent);
			backdrop-filter: blur(4px);
		}

		text {
			font-weight: 700;
			text-anchor: middle;
			paint-order: stroke;
		}
	`,
})
export class AvatarFigureComponent {
	public readonly look = input.required<AvatarLook>();
	public readonly view = input<AvatarView>('front');
	/**
	 * Which cut of the wardrobe to draw. Left to the caller rather than
	 * measured here: what matters is how large this is drawn, which the page
	 * around it knows and a component asked to redraw itself mid-load would
	 * only guess at — and guessing wrong costs a second download of every
	 * layer.
	 */
	public readonly size = input<AvatarLayerSize>('large');

	private readonly avatars = inject(AvatarEffect);

	protected readonly viewBox = `0 0 ${AVATAR_SIZE.width} ${AVATAR_SIZE.height}`;
	protected readonly mark = AVATAR_TATTOO_MARK;

	/** The layers on the stage: the last look that finished loading. */
	protected readonly shown = signal<string[]>([]);
	protected readonly loading = signal(true);

	/**
	 * The ink goes on with the layers rather than with the look, so it
	 * appears together with the arm it is drawn on and not a moment before.
	 */
	private readonly inked = signal('');
	protected readonly tattoo = computed(() => this.inked() || null);

	/** Set when a layer of the chosen look has no picture to draw. */
	protected readonly unavailable = signal(false);

	/** Counts the looks asked for, so one arriving late is discarded. */
	private asked = 0;

	constructor() {
		effect(() => {
			const look = this.look();
			const view = this.view();
			const size = this.size();

			void this.draw(
				avatarLayers(look, view).map((file) =>
					this.avatars.layerUrl(file, size)
				),
				view === 'front' && showsTattoo(look)
					? AVATAR_TATTOO_GLYPHS[look.tattoo]
					: ''
			);
		});
	}

	/**
	 * Loads a look and puts it on the stage whole. A garment chosen while
	 * this one was loading has already asked for its own draw, and its
	 * answer is the one that counts however the two loads finish.
	 */
	private async draw(urls: string[], glyph: string): Promise<void> {
		const turn = ++this.asked;

		this.loading.set(true);

		try {
			await Promise.all(urls.map((url) => loadAvatarLayer(url)));
		} catch (error) {
			// A layer with no picture behind it leaves the previous look
			// standing — a better answer than a character with a hole in it —
			// but silently doing nothing reads as a broken button, so the
			// figure says so.
			console.error(error);

			if (turn === this.asked) {
				this.unavailable.set(true);
				this.loading.set(false);
			}

			return;
		}

		if (turn !== this.asked) {
			return;
		}

		this.shown.set(urls);
		this.inked.set(glyph);
		this.unavailable.set(false);
		this.loading.set(false);
	}
}
