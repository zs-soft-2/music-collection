import {
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	DestroyRef,
	computed,
	effect,
	inject,
	input,
	signal,
	untracked,
} from '@angular/core';

import { type TrackImage } from '@music-collection/api';

/** How long one picture holds the header before the next comes up. */
const SLIDE_MS = 7000;

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
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-track-image-backdrop',
	host: { 'aria-hidden': 'true' },
	template: `
		@for (photo of images(); track photo.uid) {
			<img
				class="shot"
				[style.opacity]="$index === shown() ? 1 : 0"
				[src]="photo.filePath"
				alt=""
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
			transition: opacity 1.4s ease;
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
				transition: none;
			}
		}
	`,
})
export class TrackImageBackdropComponent {
	public readonly images = input.required<TrackImage[]>();

	private readonly document = inject(DOCUMENT);

	/** Which picture is up. */
	protected readonly shown = signal(0);

	private readonly stillness =
		this.document.defaultView?.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches ?? false;

	private readonly count = computed(() => this.images().length);

	public constructor() {
		// A list that grew or shrank must not leave the header pointing at a
		// picture that is no longer there.
		effect(() => {
			const count = this.count();

			untracked(() => {
				if (this.shown() >= count) {
					this.shown.set(0);
				}
			});
		});

		const clock = setInterval(() => {
			const count = this.count();

			if (count > 1 && !this.stillness) {
				this.shown.update((index) => (index + 1) % count);
			}
		}, SLIDE_MS);

		inject(DestroyRef).onDestroy(() => clearInterval(clock));
	}
}
