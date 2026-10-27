/**
 * The sides of a record, read from the positions printed on it.
 *
 * A vinyl release numbers its tracks by side ("A1", "B3"), a CD or a digital
 * release by a running number ("3", "2-04"). That difference is the whole
 * detection: where the positions name sides, the album has sides and can be
 * turned over; where they do not, there is nothing to turn.
 */

/** One side of a record: "A", or "1-B" on a boxed set. */
export interface TrackSide {
	/** Sides compare by this; it is the disc and the letter together. */
	key: string;
	/** "Side B", or "Disc 2 · Side B" where the release has several. */
	label: string;
}

/**
 * A position as a side: an optional disc number, then the side letter, then
 * the track number within the side. The letter may be doubled ("AA2" on a
 * 12"), but only as itself — so a "CD1-1" stays what it is, a disc.
 */
const SIDE_POSITION = /^(?:(\d+)[-.])?([A-Za-z])(\2)?[-. ]?(\d{1,3})?$/;

/** The side the position is on, or null where the release has no sides. */
export function trackSide(
	position: string | null | undefined
): TrackSide | null {
	const match = SIDE_POSITION.exec((position ?? '').trim());

	if (!match) {
		return null;
	}

	const [, disc, letter, repeated] = match;
	const side = `${letter}${repeated ?? ''}`.toUpperCase();

	return {
		key: disc ? `${disc}-${side}` : side,
		label: disc ? `Disc ${disc} · Side ${side}` : `Side ${side}`,
	};
}

/** A track as the side break reads it. */
export interface SidedTrack {
	id: string;
	position?: string | null;
}

/**
 * Where the record has to be turned over: the first track of every side but
 * the first, by track id. Empty for a release without sides, and for one
 * whose positions only name one side — there is nothing to turn either.
 */
export function sideBreaks(
	tracks: readonly SidedTrack[]
): Map<string, TrackSide> {
	const breaks = new Map<string, TrackSide>();
	let previous: string | null = null;

	for (const track of tracks) {
		const side = trackSide(track.position);

		if (!side) {
			// A release mixing sided and unsided positions is not a record
			// anyone turns over; the gap alone should not start a new side.
			continue;
		}
		if (previous !== null && side.key !== previous) {
			breaks.set(track.id, side);
		}
		previous = side.key;
	}

	return breaks;
}
