/**
 * How one picture gives way to the next.
 *
 * A slideshow that always dissolves reads as one long picture; the crossing
 * is what tells the eye that something new arrived. So each turn gets its
 * own: a push, a wipe, a step through the frame. Which one is decided by the
 * turn number alone, never by a random draw — the stage's whole contract is
 * that the same second of the same song looks the same, for two listeners
 * side by side and for a video rendered from it later.
 */

export type SlideEffect =
	'dissolve' | 'push' | 'zoom' | 'wipe' | 'rise' | 'drift';

/**
 * The crossings, in the order they come round. Neighbours are deliberately
 * unlike each other — a soft dissolve after a hard push — so a song long
 * enough to come back round does not feel like it is repeating itself.
 */
export const SLIDE_EFFECTS: readonly SlideEffect[] = [
	'dissolve',
	'push',
	'zoom',
	'wipe',
	'rise',
	'drift',
];

/** Which picture a layer is, this instant. */
export type SlideRole = 'current' | 'next' | 'hidden';

/** Everything the CSS needs for one layer, worked out from the position. */
export interface SlideFrame {
	opacity: number;
	transform: string;
	filter: string;
	clipPath: string;
	/**
	 * The arriving picture is always on top. Without this the last crossing
	 * of a round — the newest picture coming back to the first, which sits
	 * below everything in the DOM — would happen underneath the picture it
	 * is replacing, and the listener would see nothing at all.
	 */
	zIndex: number;
}

/** The crossing that ends the given turn. */
export function effectAt(turn: number): SlideEffect {
	if (!Number.isFinite(turn)) {
		return SLIDE_EFFECTS[0];
	}

	const index = Math.floor(turn) % SLIDE_EFFECTS.length;

	return SLIDE_EFFECTS[index < 0 ? index + SLIDE_EFFECTS.length : index];
}

/** Softens both ends of the crossing, so nothing starts or stops abruptly. */
function ease(fade: number): number {
	const clamped = Math.min(Math.max(fade, 0), 1);

	return clamped * clamped * (3 - 2 * clamped);
}

/** Keeps the style strings short, and stops a re-render over a billionth. */
function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function transform(x: number, y: number, scale: number): string {
	return `translate(${round(x)}%, ${round(y)}%) scale(${round(scale)})`;
}

/**
 * A blur of nothing is still a blur as far as the browser is concerned — it
 * keeps the picture on its own surface for the whole of its turn. So a
 * radius that has rounded away is dropped altogether.
 */
function blur(radius: number): string {
	const px = round(radius);

	return px > 0 ? `blur(${px}px)` : 'none';
}

const STILL = { filter: 'none', clipPath: 'none' };

/**
 * The layer's look at this instant.
 *
 * `zoom` is the slow push into the picture the stage is already running; a
 * crossing scales on top of it rather than instead of it, so the drift never
 * stops dead while two pictures are changing places.
 */
export function slideFrame(
	role: SlideRole,
	effect: SlideEffect,
	fade: number,
	zoom = 1
): SlideFrame {
	if (role === 'hidden') {
		return {
			...STILL,
			opacity: 0,
			transform: transform(0, 0, zoom),
			zIndex: 0,
		};
	}

	const moved = ease(fade);
	const arriving = role === 'next';
	const zIndex = arriving ? 2 : 1;

	switch (effect) {
		case 'push':
			// A hard edge travelling across the frame: the new picture is
			// opaque from the first pixel, the old one is shoved along.
			return {
				...STILL,
				opacity: 1,
				transform: arriving
					? transform(100 * (1 - moved), 0, zoom)
					: transform(-30 * moved, 0, zoom),
				zIndex,
			};
		case 'zoom':
			// Stepping through the frame: the next picture falls back from
			// too close while the one leaving swells past the edges.
			return {
				...STILL,
				opacity: arriving ? fade : 1,
				transform: arriving
					? transform(0, 0, zoom * (1.35 - 0.35 * moved))
					: transform(0, 0, zoom * (1 + 0.12 * moved)),
				zIndex,
			};
		case 'wipe':
			// Uncovered from the left edge, both pictures otherwise still.
			return {
				opacity: 1,
				transform: transform(0, 0, zoom),
				filter: 'none',
				// Unclipped the moment it has the frame: a picture that
				// holds for seconds should not be left behind a mask.
				clipPath:
					arriving && moved < 1
						? `inset(0 0 0 ${round(100 * (1 - moved))}%)`
						: 'none',
				zIndex,
			};
		case 'rise':
			return {
				...STILL,
				opacity: arriving ? fade : 1,
				transform: arriving
					? transform(0, 22 * (1 - moved), zoom)
					: transform(0, -10 * moved, zoom),
				zIndex,
			};
		case 'drift':
			// Out of focus and back into it — the gentlest of the six, and
			// the one that suits a picture with no clear subject. The
			// radii stay small on purpose: blur both layers hard and the
			// middle of the crossing is a second of mud, with nothing on
			// the screen the eye can hold on to.
			return {
				clipPath: 'none',
				opacity: arriving ? fade : 1,
				transform: arriving
					? transform(
							-6 * (1 - moved),
							0,
							zoom * (1.08 - 0.08 * moved)
						)
					: transform(5 * moved, 0, zoom),
				filter: arriving ? blur(9 * (1 - moved)) : blur(5 * moved),
				zIndex,
			};
		case 'dissolve':
		default:
			return {
				...STILL,
				opacity: arriving ? fade : 1,
				transform: transform(0, 0, zoom),
				zIndex,
			};
	}
}
