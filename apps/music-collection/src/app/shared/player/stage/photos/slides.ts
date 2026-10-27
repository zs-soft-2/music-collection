/**
 * Which of a song's pictures is up, worked out from the playback position
 * rather than from a timer of its own.
 *
 * The position is the only clock the stage trusts: it stops when the music
 * stops, it jumps when the listener seeks, and two listeners at the same
 * second of the same song see the same picture. A timer would do none of
 * that — and a slideshow driven by one could not be rendered into a video
 * later, because there would be nothing to ask what the tenth second looks
 * like.
 */

export interface Slide {
	/** The picture on show; -1 when there are none. */
	index: number;
	/** The one fading in behind it. */
	next: number;
	/** How far that one has come, 0-1. */
	fade: number;
	/**
	 * Which turn of the slideshow this is, counted from the start of the
	 * song and never reset by the pictures running out. It is what picks
	 * the crossing, so the crossings keep changing even when the pictures
	 * have started coming round again.
	 */
	turn: number;
}

const NONE: Slide = { index: -1, next: -1, fade: 0, turn: 0 };

/**
 * The slide at `positionSeconds`, given how long each is up and how long the
 * crossing between two takes.
 */
export function slideAt(
	count: number,
	positionSeconds: number,
	slideSeconds: number,
	fadeSeconds: number
): Slide {
	if (count <= 0 || !Number.isFinite(count)) {
		return NONE;
	}
	if (count === 1) {
		return { index: 0, next: 0, fade: 0, turn: 0 };
	}

	const position = Number.isFinite(positionSeconds)
		? Math.max(positionSeconds, 0)
		: 0;
	const turn = Math.floor(position / slideSeconds);
	const within = position - turn * slideSeconds;
	const crossing = Math.min(fadeSeconds, slideSeconds);
	const begins = slideSeconds - crossing;

	return {
		index: turn % count,
		next: (turn + 1) % count,
		fade: within > begins ? Math.min((within - begins) / crossing, 1) : 0,
		turn,
	};
}

/**
 * How far into the picture's own turn we are, 0-1 — what the slow zoom is
 * drawn from, so it runs with the music instead of restarting whenever the
 * page re-renders.
 */
export function slideProgress(
	positionSeconds: number,
	slideSeconds: number
): number {
	const position = Number.isFinite(positionSeconds)
		? Math.max(positionSeconds, 0)
		: 0;

	return (position % slideSeconds) / slideSeconds;
}
