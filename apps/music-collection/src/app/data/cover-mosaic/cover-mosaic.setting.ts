import { UserSetting } from '../user-settings';

/**
 * How a tile changes from one cover to the next.
 *
 * The pace says how often the picture moves; this says what the movement
 * looks like. They are separate answers because they are separate tastes: a
 * collector who wants the mosaic to breathe slowly may still want the change
 * itself to be a snap rather than a dissolve.
 */
export type CoverMovement = 'fade' | 'slide' | 'flip' | 'zoom';

/** The movements themselves, in the order the profile offers them. */
export const COVER_MOVEMENTS: readonly CoverMovement[] = [
	'fade',
	'slide',
	'flip',
	'zoom',
];

/**
 * What the collector picked: one movement for every turn, or `random` — a
 * different one drawn each time.
 *
 * `random` is an answer about the movements rather than a movement of its
 * own, which is why it is a value here and not a fifth entry in
 * `COVER_MOVEMENTS`: nothing that draws a tile can be asked to animate it.
 */
export type CoverTurn = CoverMovement | 'random';

/** The ones the profile offers, in the order it offers them. */
export const COVER_TURNS: readonly CoverTurn[] = [...COVER_MOVEMENTS, 'random'];

/** The quietest of them, which is what a mosaic does until told otherwise. */
export const DEFAULT_COVER_TURN: CoverMovement = 'fade';

/**
 * Whether the covers standing in for a collection move, and how.
 *
 * A collection without artwork of its own is drawn as a mosaic of the covers
 * it resolves to — four of them, out of a set that is usually far longer. The
 * four are the first four, so a twenty-record collection shows the same four
 * forever and says nothing about the other sixteen. Letting one tile change
 * every so often gives the rest of the set a turn.
 *
 * It stays off until the collector asks for it: a moving picture nobody asked
 * for is a distraction, and every swap is a cover fetched over the network.
 */
export interface CoverMosaicSettings {
	/** Seconds between two swaps; 0 holds the mosaic still. */
	rotateSeconds: number;
	/** What the swap itself looks like. */
	turn: CoverTurn;
}

/** A mosaic nobody has set stands still. */
export const NO_COVER_ROTATION = 0;

/**
 * The paces the profile offers. Nothing faster than five seconds: below that
 * the tile is changing while it is still being looked at, and a page of cards
 * becomes a page of flicker.
 */
export const COVER_ROTATION_CHOICES: readonly number[] = [
	NO_COVER_ROTATION,
	5,
	10,
	30,
];

/** A stored pace counts only while it is one of the offered ones. */
function knownPace(value: unknown): number {
	return COVER_ROTATION_CHOICES.includes(value as number)
		? (value as number)
		: NO_COVER_ROTATION;
}

/** The same for the movement: an unknown name leaves the quiet one. */
function knownTurn(value: unknown): CoverTurn {
	return COVER_TURNS.includes(value as CoverTurn)
		? (value as CoverTurn)
		: DEFAULT_COVER_TURN;
}

export const COVER_MOSAIC_SETTING: UserSetting<CoverMosaicSettings> = {
	id: 'cover-mosaic',
	featureKey: 'cover-mosaic-setting',
	storageKey: 'mc-cover-mosaic',
	toValue: (data) => ({
		rotateSeconds: knownPace(data['rotateSeconds']),
		turn: knownTurn(data['turn']),
	}),
	toDocument: ({ rotateSeconds, turn }) => ({ rotateSeconds, turn }),
};
