import {
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	signal,
	untracked,
	viewChildren,
} from '@angular/core';

import { type TrackImage } from '@music-collection/api';
import { PhotoMosaicComponent } from '../../../../shared/photo-mosaic';

/** How long one picture holds the header before the next comes up. */
const SLIDE_MS = 7000;

/** How long the picture on show takes to come apart over the next one. */
const CROSSING_MS = 1300;

/** The picture coming apart, while it is coming apart. */
interface Breaking {
	src: string;
	/** Counted up with every change, so no two changes break up alike. */
	turn: number;
	/** Where the picture had drifted to when it started to go. */
	transform: string;
}

/**
 * The song's own pictures as the header's background.
 *
 * Not a strip of thumbnails: a photograph of the song is atmosphere, and
 * atmosphere belongs behind the title rather than beside it. With more than
 * one picture the header moves slowly through them, so every picture is seen
 * without anything being clicked.
 *
 * Its own clock rather than the player's: a header is dressed whether
 * anything is playing or not. The player's stage has a position to follow and
 * follows it; this one only has to breathe.
 *
 * The breathing is the browser's own doing — a drift up or down that the
 * stylesheet runs and that is paused on every picture but the one on show, so
 * a header left open is not a page animating six pictures at once. Only the
 * crossing is counted out in script, and only for the second or so it lasts.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-track-image-backdrop',
	host: { 'aria-hidden': 'true' },
	imports: [PhotoMosaicComponent],
	template: `
		@for (photo of images(); track photo.uid) {
			<img
				#shot
				class="shot"
				[class.up]="$index === shown()"
				[style.opacity]="$index === shown() ? 1 : 0"
				[style.animation-delay]="$index * -4 + 's'"
				[style.animation-direction]="
					$index % 2 ? 'alternate-reverse' : 'alternate'
				"
				[src]="photo.filePath"
				alt=""
			/>
		}
		@if (breaking(); as breaking) {
			<mc-photo-mosaic
				[src]="breaking.src"
				[fade]="fade()"
				[turn]="breaking.turn"
				[transform]="breaking.transform"
			/>
		}
		<div class="scrim"></div>
	`,
	styles: `
		:host {
			position: absolute;
			inset: 0;
			display: block;
			overflow: hidden;
			pointer-events: none;
			border-radius: inherit;
		}

		.shot {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			/* The picture is the header's colour; it is not held back. */
			filter: saturate(1.12) contrast(1.04);
			/*
			 * Paused on every picture but the one on show. Nothing but the
			 * play state is switched, so a picture that comes round again
			 * carries on from where it was left rather than starting over.
			 */
			animation: mc-shot-drift 18s ease-in-out infinite;
			animation-play-state: paused;
		}

		.shot.up {
			animation-play-state: running;
		}

		/*
		 * The same colour the pictures are given, so the one coming apart
		 * does not change shade at the moment it breaks into tiles.
		 */
		mc-photo-mosaic {
			filter: saturate(1.12) contrast(1.04);
		}

		/*
		 * Up and down, and a slow push in with it. The picture starts a
		 * twentieth larger than the header so there is something outside the
		 * frame to move into: at its own size, a picture that drifted would
		 * show the card behind its edge.
		 */
		@keyframes mc-shot-drift {
			from {
				transform: translateY(-2.4%) scale(1.07);
			}
			to {
				transform: translateY(2.4%) scale(1.13);
			}
		}

		/*
		 * The scrim is mixed from the card's own colour, so it works in both
		 * themes. It is deliberately short: it covers the strip the title
		 * stands on and lets go of the picture by the middle — what makes
		 * the words readable past that is their own shadow, not a veil over
		 * the photograph.
		 */
		.scrim {
			position: absolute;
			inset: 0;
			background:
				linear-gradient(
					to right,
					var(--mc-card-bg) 0%,
					color-mix(in srgb, var(--mc-card-bg) 70%, transparent) 18%,
					color-mix(in srgb, var(--mc-card-bg) 28%, transparent) 42%,
					transparent 65%
				),
				linear-gradient(
					to bottom,
					color-mix(in srgb, var(--mc-card-bg) 22%, transparent) 0%,
					transparent 28%,
					color-mix(in srgb, var(--mc-card-bg) 30%, transparent) 100%
				);
		}

		@media (prefers-reduced-motion: reduce) {
			.shot {
				animation: none;
			}
		}
	`,
})
export class TrackImageBackdropComponent {
	public readonly images = input.required<TrackImage[]>();

	private readonly document = inject(DOCUMENT);

	/** Which picture is up. */
	protected readonly shown = signal(0);

	/** The one coming apart over it, and how far it has got. */
	protected readonly breaking = signal<Breaking | null>(null);
	protected readonly fade = signal(0);

	private readonly shots = viewChildren<ElementRef<HTMLImageElement>>('shot');

	private readonly view = this.document.defaultView;

	private readonly stillness =
		this.view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ??
		false;

	private readonly count = computed(() => this.images().length);

	/** Counted up and never reset, so each change breaks up its own way. */
	private turn = 0;
	private frame = 0;

	public constructor() {
		// A list that grew or shrank must not leave the header pointing at a
		// picture that is no longer there, or taking apart one it has lost.
		effect(() => {
			const count = this.count();

			untracked(() => {
				this.stop();

				if (this.shown() >= count) {
					this.shown.set(0);
				}
			});
		});

		const clock = setInterval(() => this.turnOver(), SLIDE_MS);

		inject(DestroyRef).onDestroy(() => {
			clearInterval(clock);
			this.stop();
		});
	}

	/**
	 * Hands the picture on show to the mosaic and brings up the next one
	 * underneath it, so the change is the old one falling away rather than
	 * one picture dissolving into another.
	 */
	private turnOver(): void {
		const count = this.count();

		if (count < 2 || this.stillness) {
			return;
		}

		const leaving = this.images()[this.shown()];
		const shot = this.shots()[this.shown()]?.nativeElement;

		this.turn++;

		if (leaving && shot) {
			this.breaking.set({
				src: leaving.filePath,
				turn: this.turn,
				transform: this.placeOf(shot),
			});
			this.fade.set(0);
			this.countCrossing();
		}

		this.shown.update((index) => (index + 1) % count);
	}

	/**
	 * Where the drift had got to, read off the picture itself. The stylesheet
	 * owns that movement, so this is the only way to ask — and the tiles have
	 * to start exactly where the picture was, or the header jumps at the
	 * moment it breaks.
	 */
	private placeOf(shot: HTMLImageElement): string {
		const place = this.view?.getComputedStyle(shot).transform;

		return place && place !== 'none' ? place : 'none';
	}

	/** Counts the crossing out, and only while it lasts. */
	private countCrossing(): void {
		const view = this.view;

		if (!view) {
			this.breaking.set(null);

			return;
		}

		const started = view.performance.now();
		const step = (now: number): void => {
			const fade = Math.min((now - started) / CROSSING_MS, 1);

			this.fade.set(fade);

			if (fade < 1) {
				this.frame = view.requestAnimationFrame(step);
			} else {
				this.stop();
			}
		};

		this.frame = view.requestAnimationFrame(step);
	}

	private stop(): void {
		if (this.frame) {
			this.view?.cancelAnimationFrame(this.frame);
			this.frame = 0;
		}

		this.breaking.set(null);
	}
}
