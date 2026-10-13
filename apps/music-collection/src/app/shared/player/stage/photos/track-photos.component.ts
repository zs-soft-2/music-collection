import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import { type TrackImage } from '@music-collection/api';
import { slideAt, slideProgress } from './slides';
import { effectAt, slideFrame, type SlideFrame } from './transitions';

/** How long one picture is up, and how long the crossing between two takes. */
const SLIDE_SECONDS = 7;
const FADE_SECONDS = 1.4;

/**
 * The song's own pictures behind the words, one after another.
 *
 * Its own component rather than another branch of the stage's template: the
 * stage already chooses between a blurred cover and an animated world, and
 * this is a third thing with a clock, a crossing and a zoom of its own.
 *
 * Every picture stays in the DOM and is shown or hidden by opacity alone.
 * Swapping the `src` of one element would make the browser fetch the next
 * picture at the moment it is needed, and a backdrop that arrives late is
 * worse than one that costs a few hundred kilobytes up front.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-track-photos',
	template: `
		@for (photo of photos(); track photo.uid) {
			@let frame = frames()[$index];
			<img
				class="photo"
				[style.opacity]="frame.opacity"
				[style.transform]="frame.transform"
				[style.filter]="frame.filter"
				[style.clip-path]="frame.clipPath"
				[style.z-index]="frame.zIndex"
				[src]="photo.filePath"
				alt=""
			/>
		}
		<div class="vignette"></div>
	`,
	styles: [
		`
			:host {
				position: absolute;
				inset: 0;
				display: block;
				overflow: hidden;
				background: #05060a;
			}

			.photo {
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				object-fit: cover;
				/*
				 * The crossing is done by the position the stage hands in, a
				 * step every 50ms, so the transition only smooths the step —
				 * a long one here would fight the clock and lag behind a
				 * seek.
				 */
				transition:
					opacity 120ms linear,
					transform 120ms linear,
					filter 120ms linear,
					clip-path 120ms linear;
				transform-origin: center;
			}

			.vignette {
				position: absolute;
				inset: 0;
				/* Above the pictures, which lift themselves while crossing. */
				z-index: 3;
				background:
					radial-gradient(
						120% 90% at 50% 40%,
						rgb(0 0 0 / 0.1) 0%,
						rgb(0 0 0 / 0.55) 70%,
						rgb(0 0 0 / 0.78) 100%
					),
					linear-gradient(
						to bottom,
						rgb(0 0 0 / 0.45),
						rgb(0 0 0 / 0.15) 35%,
						rgb(0 0 0 / 0.6)
					);
			}
		`,
	],
})
export class TrackPhotosComponent {
	public readonly photos = input.required<TrackImage[]>();
	/** Where the song is, in seconds — the only clock this follows. */
	public readonly positionSeconds = input(0);
	/**
	 * Off means the pictures simply take their turns: no zoom, and every
	 * crossing a plain dissolve. Somebody who turned the effects off — or a
	 * browser asking for less motion — is asking not to be moved about, not
	 * to be left with one picture.
	 */
	public readonly moving = input(true);

	protected readonly slide = computed(() =>
		slideAt(
			this.photos().length,
			this.positionSeconds(),
			SLIDE_SECONDS,
			FADE_SECONDS
		)
	);

	/**
	 * Which crossing this turn gets. Worked out from the turn number, so it
	 * is the same on every playback and in any video rendered from one.
	 */
	protected readonly effect = computed(() =>
		this.moving() ? effectAt(this.slide().turn) : 'dissolve'
	);

	/**
	 * Every layer's look, in the order the pictures are drawn. Computed as
	 * one array rather than read per picture from the template: the stage
	 * re-renders twenty times a second, and this way each tick works the
	 * crossing out once.
	 */
	protected readonly frames = computed((): SlideFrame[] => {
		const { index: current, next, fade } = this.slide();
		const effect = this.effect();
		const zoom = this.zoom();

		return this.photos().map((_, index) => {
			if (index === current) {
				return slideFrame('current', effect, fade, zoom);
			}
			if (index === next) {
				return slideFrame('next', effect, fade);
			}

			return slideFrame('hidden', effect, 0);
		});
	});

	/**
	 * The slow push into the picture on show, as a scale the crossing builds
	 * on. It is drawn from the position too, so a listener who seeks back to
	 * the same second sees the same frame — which is what makes this
	 * slideshow something a video could later be rendered from.
	 */
	private readonly zoom = computed(() =>
		this.moving()
			? 1 + 0.06 * slideProgress(this.positionSeconds(), SLIDE_SECONDS)
			: 1
	);
}
