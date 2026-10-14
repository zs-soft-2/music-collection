import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import {
	MOSAIC_COLUMNS,
	MOSAIC_ROWS,
	mosaicTiles,
	type MosaicTile,
} from './mosaic';

/**
 * A picture coming apart into tiles, with whatever is behind it showing
 * through the gaps.
 *
 * Its own component rather than another branch of the slideshow's template:
 * the other five crossings are one picture's worth of style, and this one is
 * two dozen elements with a clock-driven order of their own. It is handed
 * the picture and where the crossing has got to, and it keeps no state — so
 * the same second of the same song breaks up the same way every time.
 *
 * Each tile is the whole picture behind a window the size of the tile, which
 * is what keeps it honest against the plain `<img>` underneath: both are
 * `object-fit: cover` of the same file at the same size, so the moment the
 * first tile goes the picture it uncovers lines up to the pixel.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-photo-mosaic',
	template: `
		@for (tile of tiles(); track tile.key) {
			<span
				class="tile"
				[style.opacity]="tile.opacity"
				[style.transform]="tile.transform"
			>
				<img
					[style.left.%]="tile.column * -100"
					[style.top.%]="tile.row * -100"
					[src]="src()"
					alt=""
				/>
			</span>
		}
	`,
	host: {
		'[style.transform]': 'transform()',
		'[style.--mc-mosaic-columns]': 'columns',
		'[style.--mc-mosaic-rows]': 'rows',
	},
	styles: `
		:host {
			position: absolute;
			inset: 0;
			display: grid;
			grid-template-columns: repeat(var(--mc-mosaic-columns), 1fr);
			grid-template-rows: repeat(var(--mc-mosaic-rows), 1fr);
			overflow: hidden;
			transform-origin: center;
			/* The backdrop is a picture, never something to click on. */
			pointer-events: none;
		}

		.tile {
			position: relative;
			overflow: hidden;
			transform-origin: center;
			/*
			 * The crossing is stepped in by the stage every 50ms; the
			 * transition only smooths the step, as on the pictures
			 * themselves.
			 */
			transition:
				opacity 120ms linear,
				transform 120ms linear;
		}

		.tile img {
			position: absolute;
			/*
			 * As wide and as tall as the whole mosaic, pulled up and left
			 * until this tile's own part of it is in the window.
			 */
			width: calc(var(--mc-mosaic-columns) * 100%);
			height: calc(var(--mc-mosaic-rows) * 100%);
			object-fit: cover;
		}
	`,
})
export class PhotoMosaicComponent {
	/** The picture that is breaking up. */
	public readonly src = input.required<string>();
	/** How far the crossing has come, 0-1. */
	public readonly fade = input(0);
	/** Which turn of the slideshow this is — what the scatter is drawn from. */
	public readonly turn = input(0);
	/**
	 * Where the picture had got to when it started coming apart: the push
	 * into it and the drift it was under, as the caller had them. Given back
	 * whole rather than worked out here, because the two callers keep it in
	 * different places — the stage draws it from the playback position, the
	 * header from an animation the browser is running — and either way the
	 * tiles have to start exactly where the picture was, or the backdrop
	 * jumps at the moment it breaks.
	 */
	public readonly transform = input('none');

	/*
	 * The cut is the stylesheet's business as much as the tiles', and a
	 * component's styles have to be a plain string — so the grid is handed
	 * to the CSS as custom properties rather than written out twice.
	 */
	protected readonly columns = MOSAIC_COLUMNS;
	protected readonly rows = MOSAIC_ROWS;

	protected readonly tiles = computed((): MosaicTile[] =>
		mosaicTiles(this.fade(), this.turn())
	);
}
