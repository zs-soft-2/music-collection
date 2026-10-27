/**
 * The crossing that breaks a picture up.
 *
 * The departing picture is cut into a grid and the tiles leave one by one,
 * uncovering the next picture behind them. Which tile goes when is worked
 * out from the turn number and the tile's own place, never drawn at random:
 * the stage's contract is that the same second of the same song looks the
 * same, for two listeners side by side and for a video rendered from it
 * later, and a scatter chosen on the fly would break that the moment anyone
 * seeked back.
 */

/**
 * Six by four over a wide stage gives tiles that read as squares. Fewer and
 * the picture falls apart in slabs; many more and the eye stops seeing
 * tiles at all, which is the whole point of this crossing.
 */
export const MOSAIC_COLUMNS = 6;
export const MOSAIC_ROWS = 4;
export const MOSAIC_TILES = MOSAIC_COLUMNS * MOSAIC_ROWS;

/**
 * How much of the crossing is spent handing out starts. What is left is how
 * long a single tile takes to go, so the last one still has room to move
 * after the last start has been given out.
 */
const STAGGER = 0.62;

/** How much of the order is the sweep across the frame, the rest the grain. */
const SWEEP = 0.45;

/** One tile of the breaking picture: where it is cut from, and its look. */
export interface MosaicTile {
	/** Its place in the grid, which is also what the template tracks by. */
	key: number;
	column: number;
	row: number;
	opacity: number;
	/** `none` while the tile has not started, so it stays a plain box. */
	transform: string;
}

/** Keeps the style strings short, and stops a re-render over a billionth. */
function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function clamp(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

/** Softens both ends of a tile's own going, so none of them snaps away. */
function ease(fade: number): number {
	const moved = clamp(fade);

	return moved * moved * (3 - 2 * moved);
}

/**
 * A number in [0, 1) that stands still: the same tile of the same turn
 * always gets the same one, on every machine and on every playback. An
 * integer mix rather than anything drawn from `Math.random`, and not
 * `Math.sin` either — that is only as reproducible as the engine's own
 * floating point.
 */
export function mosaicGrain(index: number, turn: number): number {
	const seed =
		Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(turn + 1, 0x85ebca6b);
	const mixed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d);

	return ((mixed ^ (mixed >>> 13)) >>> 0) / 4294967296;
}

/**
 * When this tile starts going, as a share of the crossing.
 *
 * Part sweep and part grain. A pure sweep is a wipe with square teeth; pure
 * grain clumps, and leaves a corner of the old picture standing on its own
 * long after the rest has gone. Together they read as a wave eating its way
 * across the frame.
 */
function startOf(
	column: number,
	row: number,
	index: number,
	turn: number
): number {
	const far = MOSAIC_COLUMNS - 1 + (MOSAIC_ROWS - 1);
	const sweep = far > 0 ? (column + row) / far : 0;

	return SWEEP * sweep + (1 - SWEEP) * mosaicGrain(index, turn);
}

/**
 * Every tile of the breaking picture at this instant of the crossing, in
 * reading order — the order the template lays them out in.
 */
export function mosaicTiles(fade: number, turn: number): MosaicTile[] {
	const crossed = Number.isFinite(fade) ? clamp(fade) : 0;
	const counted = Number.isFinite(turn) ? Math.floor(turn) : 0;
	const tiles: MosaicTile[] = [];

	for (let index = 0; index < MOSAIC_TILES; index++) {
		const column = index % MOSAIC_COLUMNS;
		const row = Math.floor(index / MOSAIC_COLUMNS);
		const start = startOf(column, row, index, counted);
		const gone = ease(clamp((crossed - start * STAGGER) / (1 - STAGGER)));

		tiles.push({
			key: index,
			column,
			row,
			opacity: round(1 - gone),
			transform: tileTransform(gone, index, counted),
		});
	}

	return tiles;
}

/**
 * A tile shrinks back and drifts off as it goes, each one its own way.
 *
 * A tile that has not started is left with no transform at all. A transform
 * puts the tile on its own surface, and surfaces that should abut can land
 * a fraction of a pixel apart — which here would be a hairline of the next
 * picture showing through a picture that is meant to be whole.
 */
function tileTransform(gone: number, index: number, turn: number): string {
	if (gone <= 0) {
		return 'none';
	}

	const drift = mosaicGrain(index + MOSAIC_TILES, turn) * 2 - 1;
	const x = round(6 * drift * gone);
	const y = round(14 * gone);
	const scale = round(1 - 0.3 * gone);
	const spin = round(7 * drift * gone);

	return `translate(${x}%, ${y}%) scale(${scale}) rotate(${spin}deg)`;
}
