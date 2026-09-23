import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	ElementRef,
	inject,
	input,
	signal,
	viewChild,
} from '@angular/core';

/**
 * A row of cards that scrolls sideways: swiped on a phone, stepped through
 * with arrows under a mouse. The caller passes the `<li>` items and says how
 * wide they are; the row keeps the scrolling, the snapping, the fading edges
 * and the arrows to itself.
 *
 * What the caller can set, as custom properties on the host:
 *
 * - `--mc-carousel-gap`: the space between two cards (1rem).
 * - `--mc-carousel-item`: how wide one card is (10rem).
 * - `--mc-carousel-nav-top`: where the arrows sit, measured from the top of
 *   the row — half the artwork, so that they land on the picture and not on
 *   the caption below it (half the row).
 * - `--mc-carousel-bleed`: the page gutter. On a phone the row runs out to
 *   both screen edges and gives this much back as its own padding, so the
 *   first card still lines up with the heading above it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-carousel',
	template: `
		<div
			class="viewport"
			[class.more-back]="canScrollBack()"
			[class.more-ahead]="canScrollAhead()"
		>
			<ul class="track" #track [attr.aria-label]="label() || null">
				<ng-content />
			</ul>

			<button
				type="button"
				class="nav back"
				[class.shown]="canScrollBack()"
				[disabled]="!canScrollBack()"
				[attr.aria-label]="backLabel()"
				(click)="step(-1)"
			>
				<i class="pi pi-chevron-left" aria-hidden="true"></i>
			</button>

			<button
				type="button"
				class="nav ahead"
				[class.shown]="canScrollAhead()"
				[disabled]="!canScrollAhead()"
				[attr.aria-label]="aheadLabel()"
				(click)="step(1)"
			>
				<i class="pi pi-chevron-right" aria-hidden="true"></i>
			</button>
		</div>
	`,
	styles: `
		:host {
			display: block;

			/* Only a phone-width row reaches the screen edge; on a wide
			   screen it stays inside the page gutter. */
			--mc-carousel-edge: 0px;
			--mc-carousel-fade: 3rem;
		}

		.viewport {
			position: relative;
		}

		.track {
			display: flex;
			gap: var(--mc-carousel-gap, 1rem);
			margin: 0 calc(-1 * var(--mc-carousel-edge));
			padding: 0 var(--mc-carousel-edge) 0.5rem;
			overflow-x: auto;
			list-style: none;
			scroll-behavior: smooth;
			scroll-snap-type: x proximity;
			scroll-padding-inline: var(--mc-carousel-edge);
			overscroll-behavior-x: contain;

			/* The arrows and the fading edge already say that the row goes
			   on, so the bar only takes height away from the covers. */
			scrollbar-width: none;

			&::-webkit-scrollbar {
				display: none;
			}

			/* The cards fade out where the row continues, rather than the
			   page painting over them: a faded edge holds over the ambient
			   backdrop and in either theme. */
			--fade-back: 0px;
			--fade-ahead: 0px;

			mask-image: linear-gradient(
				to right,
				transparent 0,
				#000 var(--fade-back),
				#000 calc(100% - var(--fade-ahead)),
				transparent 100%
			);
		}

		.more-back .track {
			--fade-back: var(--mc-carousel-fade);
		}

		.more-ahead .track {
			--fade-ahead: var(--mc-carousel-fade);
		}

		/* Every card is the same width and stops under the same edge. The
		   cards come from the caller, so the rule has to reach past the
		   encapsulation; it still only reaches this row's own children. */
		:host ::ng-deep .track > * {
			flex: 0 0 var(--mc-carousel-item, 10rem);
			/* Without this a long title ignores the width: a flex item may
			   not shrink below its content, and the caption never wraps. */
			min-width: 0;
			scroll-snap-align: start;
		}

		.nav {
			position: absolute;
			top: var(--mc-carousel-nav-top, 50%);
			z-index: 2;
			display: none;
			place-items: center;
			width: 2.5rem;
			height: 2.5rem;
			padding: 0;
			color: var(--mc-text);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			box-shadow: var(--mc-shadow-menu);
			opacity: 0;
			transform: translateY(-50%);
			transition: opacity var(--mc-duration-fast) ease;
			cursor: pointer;

			i {
				font-size: 0.9rem;
			}

			&.shown {
				opacity: 0.85;
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}
		}

		/* A touch screen swipes instead; the arrows would only cover a cover. */
		@media (hover: hover) and (pointer: fine) {
			.nav {
				display: grid;
			}
		}

		:host(:hover) .nav.shown,
		.nav.shown:focus-visible,
		.nav.shown:hover {
			opacity: 1;
		}

		.back {
			left: 0.5rem;
		}

		.ahead {
			right: 0.5rem;
		}

		@media (max-width: 720px) {
			:host {
				--mc-carousel-edge: var(--mc-carousel-bleed, 0px);
				/* A card is narrower here, and a long fade would eat into
				   the title under it. */
				--mc-carousel-fade: 1.75rem;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.track {
				scroll-behavior: auto;
			}

			.nav {
				transition: none;
			}
		}
	`,
})
export class CarouselComponent {
	/** Names the row for a screen reader: the style, the decade, the act. */
	public readonly label = input<string>('');

	protected readonly canScrollBack = signal(false);
	protected readonly canScrollAhead = signal(false);

	protected readonly backLabel = computed(() =>
		this.label() ? `${this.label()}: earlier` : 'Scroll back'
	);
	protected readonly aheadLabel = computed(() =>
		this.label() ? `${this.label()}: further` : 'Scroll on'
	);

	private readonly track =
		viewChild.required<ElementRef<HTMLElement>>('track');

	constructor() {
		const destroyRef = inject(DestroyRef);

		afterNextRender(() => {
			const el = this.track().nativeElement;
			const sync = (): void => this.readEdges(el);

			// Scrolling only moves two signals, and the row resizes on a
			// rotation or a window drag: neither is worth a zone event.
			el.addEventListener('scroll', sync, { passive: true });

			const observer = new ResizeObserver(sync);
			observer.observe(el);
			sync();

			destroyRef.onDestroy(() => {
				el.removeEventListener('scroll', sync);
				observer.disconnect();
			});
		});
	}

	/** One screenful of whole cards, the way the arrow points. */
	protected step(direction: 1 | -1): void {
		const el = this.track().nativeElement;

		el.scrollBy({ left: direction * this.stride(el) });
	}

	/** As many whole cards as fit, so the row never stops mid-cover. */
	private stride(el: HTMLElement): number {
		const first = el.firstElementChild;
		const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
		const card = first
			? first.getBoundingClientRect().width + gap
			: /* An empty row has nothing to measure. */ 0;

		if (!card) {
			return el.clientWidth;
		}

		return Math.max(1, Math.floor(el.clientWidth / card)) * card;
	}

	private readEdges(el: HTMLElement): void {
		// A fractional width leaves a pixel behind at the far end, which
		// would keep the arrow up with nothing left to scroll to.
		const left = Math.round(el.scrollLeft);
		const last = Math.round(el.scrollWidth - el.clientWidth);

		this.canScrollBack.set(left > 1);
		this.canScrollAhead.set(left < last - 1);
	}
}
